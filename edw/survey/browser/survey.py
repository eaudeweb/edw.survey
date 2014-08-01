from copy import deepcopy
import json
import hashlib
import random

from time import time
from time import sleep
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


LABEL_FIELD_TYPES = ["labelField", "textBlockField", "richTextBlockField"]
INPUT_FIELD_TYPES = [
    "textInputField",
    "selectField",
    "radioField",
    "checkboxField"
]


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
        self.update()
        self.updateAnswers(self.payload)
        self.updateLogic(self.payload)

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = [dict(x) for x in self.storage]
        return json.dumps(data, indent=2)

    def update(self):
        idx = getIndex(self.storage, self.request_uuid)
        if idx is None:
            return self.create()
        else:
            self.storage[idx] = PersistentDict(self.payload)
            self.updateAnswers(self.payload)
            self.updateLogic(self.payload)

    def delete(self):
        idx = getIndex(self.storage, self.request_uuid)
        if idx is not None:
            self.deleteAnswers(self.request_uuid)
            self.deleteLogic(self.request_uuid)
            del self.storage[idx]

    def updateLogic(self, data):
        if data["type"] != "question":
            return
        storage = self.get_storage("logic", PersistentDict)
        uuid = data["uuid"]
        storage.setdefault(uuid, PersistentDict({})).update(data)
        if "deleted" in storage[uuid]:
            storage[uuid]["deleted"] = False

    def deleteLogic(self, uuid):
        storage = self.get_storage("logic", PersistentDict)
        data = storage.get(int(uuid), None)
        if data is None:
            return
        if data["type"] != "question":
            return
        del storage[int(uuid)]

    def updateAnswers(self, field):
        if "type" not in field:
            return
        storage = self.get_storage("answers", PersistentDict)
        for userid, fields in storage.items():
            uuid = field["uuid"]
            idx = getIndex(fields, uuid)
            persistentField = PersistentDict(field)
            if idx is None:
                storage[userid].append(persistentField)
            else:
                storage[userid][idx] = persistentField

    def deleteAnswers(self, uuid):
        storage = self.get_storage("answers", PersistentDict)
        for userid, fields in storage.items():
            idx = getIndex(fields, uuid)
            if idx is not None:
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


class AnswerQuestions(Collection):

    storage_name = "questions"

    @property
    def logic_storage(self):
        return self.get_storage("logic", default=PersistentDict)

    def get_data(self):
        ordered_questions = []
        splits_by_parent = {}

        for key, value in self.logic_storage.items():
            parent = value.get("logic_parent", None)
            splits_by_parent.setdefault(parent, []).append(value)


        for key, value in splits_by_parent.items():
            splits_by_parent[key] = sorted(value, key=lambda item: item.get("logic_position", None))

        for item in splits_by_parent["logic"]:
            if item["type"] == "question":
                ordered_questions.append(item)
            if item["type"] == "splitter":
                for split in splits_by_parent[item["uuid"]]:
                    condition = split["logic_condition"]
                    for question in splits_by_parent[split["uuid"]]:
                        question["logic_condition"] = condition
                        ordered_questions.append(question)

        return ordered_questions


    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = [dict(x) for x in self.get_data()]
        return json.dumps(data, indent=2)

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
            idx = getIndex(self.storage[userid], key)
            field = None
            if idx is None:
                field = value["field"]
                self.storage[userid].append(field)
            else:
                field = self.storage[userid][idx]

            if answer:
                field["answer"] = answer

        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = [dict(field) for field in self.storage[userid]]
        return json.dumps(data, indent=2)

    def delete_for_userid(self):
        userid = self.getUserId()
        del self.storage[userid]
        return "Deleted storage!"


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

    def dataMapping(self):
        data = {}
        for question in self.get_storage("questions"):
            data.setdefault(question["uuid"], deepcopy(question))
        for field in self.get_storage("fields"):
            data.setdefault(field["parentID"], {})
            fieldcopy = deepcopy(field)
            data[field["parentID"]].setdefault("fields", []).append(fieldcopy)
        return data

    def groupFields(self, fields, questionIds):
        data = []

        qmap = self.dataMapping()

#        [{qid: qid, labels: [{lid:lid, fields:[]}, {}]}, {}]

        for qid in questionIds:
            d = {"uuid": qid, "labels": []}
            question_fields = qmap[qid].get("fields", None)
            if question_fields is None:
                continue
            for field in question_fields:
                fieldType = field["type"]
                uuid = field["uuid"]

                if fieldType in LABEL_FIELD_TYPES:
                    d["labels"].append({"uuid": uuid,
                                        "fields": [],
                                        "data": field})

                if fieldType in INPUT_FIELD_TYPES:
                    answer_index = getIndex(fields, uuid)
                    answer_field = fields[answer_index]
                    try:
                        d["labels"][-1]["fields"].append(answer_field)
                    except IndexError:
                        d["labels"].append({"uuid": uuid,
                                            "fields": [answer_field],
                                            "data": field})
            data.append(d)
        return data

    def answers(self):
        data = {}
        questionIds = [x["uuid"] for x in self.get_storage("questions")]
        for userid, fields in self.storage.items():
            data[userid] = self.groupFields(deepcopy(fields), questionIds)
        return data


class LogicQuestions(Collection):
    storage_name = "logic"
    request_uuid = None

    @property
    def storage(self):
        return self.get_storage(default=PersistentDict)

    def get_data(self):
        result = []
        for key, value in self.storage.items():
            key_type = value.get("type", None)
            if key_type == "question":
                result.append(dict(value))
        return sorted(result, key=lambda item: item.get("uuid"))

    def create(self):
        print("SHOULD NOT CREATE QUESTIONS!")

    def update(self):
        question = self.storage.get(int(self.request_uuid), None)
        if question is None:
            print("NOT GOOD!")
            return
        question.update(PersistentDict(self.payload))
        for key in question.keys():
            if key.startswith("logic_") and key not in self.payload:
                del question[key]

    def delete(self):
        print("SHOULD NOT DELETE QUESTIONS!")

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = self.get_data()
        return json.dumps(data, indent=2)


class LogicSplitters(Collection):
    storage_name = "logic"
    request_uuid = None


    @property
    def storage(self):
        return self.get_storage(default=PersistentDict)

    def get_data(self):
        result = []

        for key, value in self.storage.items():
            key_type = value.get("type", None)
            if key_type == "splitter":
                result.append(dict(value))
        return sorted(result, key=lambda item: item.get("logic_position"))

    def create(self):
        data = PersistentDict(self.payload)
        self.storage.setdefault(int(self.request_uuid), data)

    def update(self):
        splitter = self.storage.get(int(self.request_uuid), None)
        if splitter is None:
            return self.create()
        splitter.update(PersistentDict(self.payload))
        for key in splitter.keys():
            if key.startswith("logic_") and key not in self.payload:
                del splitter[key]

    def delete(self):
        del self.storage[int(self.request_uuid)]

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = self.get_data()
        return json.dumps(data, indent=2)


class LogicSplits(Collection):
    storage_name = "logic"
    request_uuid = None

    @property
    def storage(self):
        return self.get_storage(default=PersistentDict)

    def get_data(self):
        result = []

        for key, value in self.storage.items():
            key_type = value.get("type", None)
            if key_type == "split":
                result.append(dict(value))
        return sorted(result, key=lambda item: item.get("logic_position"))

    def create(self):
        data = PersistentDict(self.payload)
        self.storage.setdefault(int(self.request_uuid), data)

    def update(self):
        split = self.storage.get(int(self.request_uuid), None)
        if split is None:
            return self.create()
        split.update(PersistentDict(self.payload))
        for key in split.keys():
            if key.startswith("logic_") and key not in self.payload:
                del split[key]

    def delete(self):
        del self.storage[int(self.request_uuid)]

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        data = self.get_data()
        return json.dumps(data, indent=2)


