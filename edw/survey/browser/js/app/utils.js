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

    App.haveSameGroup = function(field1, field2) {
      return field1.get("group") === field2.get("group");
    };
    App.haveSameUUID = function(field1, field2) {
      return field1.get("uuid") === field2.get("uuid");
    };
    App.genUUID = function(){
      return new Date().getTime();
    };
    App.sleep = function(milliseconds) {
      var start = new Date().getTime();
      for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
          break;
        }
      }
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
