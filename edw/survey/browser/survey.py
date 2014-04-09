from copy import deepcopy
import json
import hashlib
import random

from time import time
from zope.interface import implements
from Products.Five.browser import BrowserView
from zope.publisher.interfaces import IPublishTraverse
from zope.annotation.interfaces import IAnnotations
from BTrees.OOBTree import OOBTree
from persistent.dict import PersistentDict
from persistent.list import PersistentList

from Products.CMFCore.utils import getToolByName
from edw.survey.config import PROJECTNAME


QUESTIONS = []
FIELDS = []


def getIndex(collection, value, prop="uuid"):
    for idx, item in enumerate(collection):
        if item[prop] == int(value):
            return idx


class CommonView(BrowserView):

    def get_storage(self, storage_name=None, default=PersistentList):
        if not storage_name:
            storage_name = self.storage_name
        annotations = IAnnotations(self.context)
        annotation = annotations.setdefault(PROJECTNAME, OOBTree())
        store = annotation.get(storage_name, [])
        if not store or not isinstance(store, default):
            annotation[storage_name] = default(store)
        return annotation[storage_name]

    storage = property(get_storage)

    def getUserId(self):
        portal_membership = getToolByName(self.context, 'portal_membership')
        if portal_membership.isAnonymousUser():
            return self.getToken()
        else:
            return portal_membership.getAuthenticatedMember().getId()

    def generateToken(self):
        seed = "{0}{1}".format(time(), random.random())
        token = hashlib.sha1(seed).hexdigest()
        return token

    def getToken(self):
        cookie = self.request.cookies.get("surveyid", "")
        if cookie:
            return cookie
        token = self.generateToken()
        cookie_path = self.context.absolute_url()
        self.request.RESPONSE.setCookie("surveyid", token, path=cookie_path)
        return token


class Collection(CommonView, BrowserView):
    implements(IPublishTraverse)

    def __call__(self, *args, **kwargs):
        return self.handle()

    def savePayload(self):
        self.request.stdin.seek(0)
        try:
            self.payload = json.loads(self.request.stdin.read())
        except ValueError:
            self.payload = ""

    def getMethod(self):
        method = self.request.get("HTTP_X_HTTP_METHOD_OVERRIDE", "")
        if not method:
            method = self.request.get("REQUEST_METHOD", "")
        return method

    def handle(self):
        self.savePayload()
        method = self.getMethod()

        url = self.request["ACTUAL_URL"]
        if method == "GET":
            return self.read()
        elif method == "POST":
            return self.create()
        elif method == "PUT":
            return self.update()
        elif method == "DELETE":
            return self.delete()
        return url

    def publishTraverse(self, request, name):
        self.request_uuid = name
        return self.handle()

    def create(self):
        data = PersistentDict(self.payload)
        self.storage.append(data)

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = [dict(x) for x in self.storage]
        return json.dumps(data, indent=2)

    def update(self):
        idx = getIndex(self.storage, self.request_uuid)
        if not idx:
            return self.create()
        self.storage[idx] = PersistentDict(self.payload)
        self.updateAnswers(self.payload)

    def delete(self):
        idx = getIndex(self.storage, self.request_uuid)
        self.deleteAnswers(self.request_uuid)
        del self.storage[idx]

    def updateAnswers(self, field):
        storage = self.get_storage("answers", PersistentDict)
        for userid, fields in storage.items():
            uuid = field["uuid"]
            idx = getIndex(fields, uuid)
            persistentField = PersistentDict(field)
            if not idx:
                storage[userid].append(persistentField)
            else:
                storage[userid][idx] = persistentField

    def deleteAnswers(self, uuid):
        storage = self.get_storage("answers", PersistentDict)
        for userid, fields in storage.items():
            idx = getIndex(fields, uuid)
            if idx:
                del storage[userid][idx]


class Fields(Collection):

    storage_name = "fields"


class Questions(Collection):

    storage_name = "questions"


class AnswerFields(Collection):
    storage_name = "answers"
    request_uuid = None

    @property
    def storage(self):
        return self.get_storage(default=PersistentDict)

    def get_fields(self):
        fields = self.get_storage(storage_name="fields")
        userid = self.request_uuid or self.getUserId()
        user_storage = self.storage.setdefault(userid, deepcopy(fields))
        return user_storage

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = [dict(x) for x in self.get_fields()]
        return json.dumps(data, indent=2)


class ClearDataView(CommonView):
    def clear(self):
        annotations = IAnnotations(self.context)
        annotations[PROJECTNAME] = OOBTree()
        message = "Survey data cleared."
        self.context.plone_utils.addPortalMessage(message, 'info')
        redirect_url = self.context.absolute_url() + "/survey_edit"
        return self.request.RESPONSE.redirect(redirect_url)


class SubmitAnswerView(CommonView, BrowserView):

    storage_name = "answers"

    @property
    def storage(self):
        return self.get_storage(default=PersistentDict)

    def save(self):
        self.request.stdin.seek(0)
        payload = json.loads(self.request.stdin.read())
        userid = self.getUserId()
        for key, value in payload.items():
            answer = value["answer"]
            if answer:
                idx = getIndex(self.storage[userid], key)
                self.storage[userid][idx]["answer"] = value["answer"]

        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = [dict(field) for field in self.storage[userid]]
        return json.dumps(data, indent=2)


class ImportExportView(CommonView, BrowserView):

    def importer(self):
        data = json.loads(self.request.importfile.read())
        storage_names = [Fields.storage_name, Questions.storage_name]
        annotations = IAnnotations(self.context)
        annotation = annotations.setdefault(PROJECTNAME, OOBTree())
        for name in storage_names:
            annotation[name] = PersistentList()
            annotation[name].extend([PersistentDict(x) for x in data[name]])
        self.context.plone_utils.addPortalMessage("Import successful.", 'info')
        redirect_url = self.context.absolute_url() + "/survey_edit"
        return self.request.RESPONSE.redirect(redirect_url)

    def exporter(self):
        annotations = IAnnotations(self.context)
        annotation = annotations.setdefault(PROJECTNAME, OOBTree())
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        header("Content-Disposition", "attachment;filename=export.json")
        data = {}
        data["fields"] = [dict(x) for x in annotation["fields"]]
        data["questions"] = [dict(x) for x in annotation["questions"]]
        return json.dumps(data, indent=2)


class AnswersView(CommonView):
    storage_name = "answers"

    @property
    def storage(self):
        return self.get_storage(default=PersistentDict)

    def answers(self):
        return self.storage
