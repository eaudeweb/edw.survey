/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = null;

    if(window.edw.survey.view !== undefined){
      App = window.edw.survey.view;
    }
    else if(window.edw.survey.edit.questions !== undefined) {
      App = window.edw.survey.edit.questions;
    }

    var templates = [
      {"name": "question", "target": "#question-template"}
    ];
    _.each(templates, function(val){
      App.Templates.sources.push(val);
    });

    App.FieldsList = Backbone.Collection.extend({
      localStorage: new Backbone.LocalStorage("FieldsListView")
    });

    App.Question = Backbone.Model.extend({
      initialize: function(){
        this.template = App.Templates.compiled.question;
      },
      defaults: function(){
        var def = {
          name:  "the first!",
          fields: new App.FieldsList()
        };
        return def;
      },
      genUUID: function(){
        this.set("uuid", new Date().getTime());
      },
      parse: function(response){
        var fields = new App.FieldsList();
        _.each(response.fields, function(val, idx, list){
          var constructor = App.FieldMapping[val.type].constructor;
          fields.add(new constructor(val));
        }, this);
        response.fields = fields;
        return response;
      }
    });

  });
})(jQuery);
