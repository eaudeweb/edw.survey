import json
from zope.interface import implements
from Products.Five.browser import BrowserView
from zope.publisher.interfaces import IPublishTraverse


QUESTIONS = []
FIELDS = []


class Collection(BrowserView):
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


class Fields(Collection):
    def create(self):
        FIELDS.append(self.payload)

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        return json.dumps(FIELDS, indent=2)

    def update(self):
        idx = self.getIndex(FIELDS, self.request_uuid)
        if not idx:
            return self.create();
        FIELDS[idx] = self.payload

    def delete(self):
        idx = self.getIndex(FIELDS, self.request_uuid)
        del FIELDS[idx]


class Questions(Collection):
    def create(self):
        QUESTIONS.append(self.payload)

    def read(self):
        header = self.request.RESPONSE.setHeader
        header("Content-Type", "application/json")
        return json.dumps(QUESTIONS, indent=2)

    def update(self):
        idx = self.getIndex(QUESTIONS, self.request_uuid)
        if not idx:
            return self.create();
        QUESTIONS[idx] = self.payload

    def delete(self):
        idx = self.getIndex(QUESTIONS, self.request_uuid)
        del QUESTIONS[idx]
