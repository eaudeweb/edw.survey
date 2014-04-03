"""Definition of the Survey content type
"""

from datetime import datetime

from zope.interface import implements
from zope.annotation.interfaces import IAnnotations

from BTrees.OOBTree import OOBTree
from persistent.dict import PersistentDict
from persistent.list import PersistentList

from Products.Archetypes import atapi
from Products.ATContentTypes.content import folder
from Products.ATContentTypes.content import schemata
from Products.CMFCore.utils import getToolByName

# -*- Message Factory Imported Here -*-

from edw.survey.interfaces import ISurvey
from edw.survey.config import PROJECTNAME

SurveySchema = folder.ATFolderSchema.copy() + atapi.Schema((

))


schemata.finalizeATCTSchema(
    SurveySchema,
    folderish=True,
    moveDiscussion=False
)


class Survey(folder.ATFolder):
    """Survey"""
    implements(ISurvey)

    meta_type = "edw.survey"
    portal_type = "edw.survey"
    schema = SurveySchema

atapi.registerType(Survey, PROJECTNAME)
