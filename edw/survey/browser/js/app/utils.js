/*global Backbone */


(function($){
  $(document).ready(function(){

    Backbone.emulateHTTP = true;

    var App = null;

    if(window.edw.survey.view !== undefined){
      App = window.edw.survey.view;
    }
    else if(window.edw.survey.edit.questions !== undefined) {
      App = window.edw.survey.edit.questions;
    }
    else if(window.edw.survey.edit.logic !== undefined) {
      App = window.edw.survey.edit.logic;
    }

    App.genUUID = function(){
      return new Date().getTime();
    };
    App.popViewFromArray = function(view, array){
      index = _.map(array, function(el){
        return el.model == view.model;
      }).indexOf(true);
      return array.splice(index, 1)[0];
    };
    App.Templates.compiled = {};
    App.Templates.load = function(data){
      var html = $(data);
      _.each(this.sources, function(value, key, list){
        this.compiled[value.name] = _.template(html.filter(value.target).html());
      }, this);
    };
  });
})(jQuery);
