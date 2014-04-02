from setuptools import setup, find_packages
import os

version = open('version.txt').read().strip()

setup(name='edw.survey',
      version=version,
      description="Survey product",
      long_description=open("README.txt").read() + "\n" +
                       open(os.path.join("docs", "HISTORY.txt")).read(),
      # Get more strings from
      # http://pypi.python.org/pypi?:action=list_classifiers
      classifiers=[
        "Programming Language :: Python",
        ],
      keywords='edw survey',
      author='David Batranu',
      author_email='david.batranu@eaudeweb.ro',
      url='http://github.com/edw/edw.survey',
      license='GPL',
      packages=find_packages(exclude=['ez_setup']),
      namespace_packages=['edw'],
      include_package_data=True,
      zip_safe=False,
      install_requires=[
          'setuptools',
      ],
      entry_points="""
      # -*- Entry points: -*-
      """,
      )
