""" Interfaces
"""
from zope.interface import Interface


class ISurveyInstalled(Interface):
    """ Marker interface that defines a Zope 3 browser layer.
    """

class ISurvey(Interface):
    """ Marker interface for the survey
    """
