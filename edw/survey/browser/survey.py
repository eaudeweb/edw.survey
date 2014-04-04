import json
from datetime import datetime
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


class CommonView(BrowserView):

    @property
    def storage(self):
        annotations = IAnnotations(self.context)
        annotation = annotations.setdefault(PROJECTNAME, OOBTree())
        store = annotation.get(self.storage_name, [])
        if not store or not isinstance(store, PersistentList):
            annotation[self.storage_name] = PersistentList(store)
        return annotation[self.storage_name]


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

    def getIndex(self, collection, uuid):
        for idx, item in enumerate(collection):
            if item["uuid"] == int(uuid):
                return idx

    def create(self):
        data = PersistentDict(self.payload)
        self.storage.append(data)

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = [dict(x) for x in self.storage]
        return json.dumps(data, indent=2)

    def update(self):
        idx = self.getIndex(self.storage, self.request_uuid)
        if not idx:
            return self.create();
        self.storage[idx] = PersistentDict(self.payload)

    def delete(self):
        idx = self.getIndex(self.storage, self.request_uuid)
        del self.storage[idx]


class Fields(Collection):

    storage_name = "fields"


class Questions(Collection):

    storage_name = "questions"

class SubmitAnswerView(CommonView, BrowserView):
    def save(self):
        return self.request


class ImportExportView(CommonView, BrowserView):

    def importer(self):
        data = json.loads(self.request.importfile.read())
        for question in data["questions"]:
            annotations = IAnnotations(self.context)
            annotation = annotations.setdefault(PROJECTNAME, OOBTree())
            store = annotation.get("questions")
            store.append(PersistentDict(question))


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

