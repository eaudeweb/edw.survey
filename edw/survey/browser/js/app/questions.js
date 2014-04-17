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
    else if(window.edw.survey.edit.logic !== undefined) {
      App = window.edw.survey.edit.logic;
    }

    var templates = [
      {"name": "question", "target": "#question-template"}
    ];
    _.each(templates, function(val){
      App.Templates.sources.push(val);
    });

    App.FieldsList = Backbone.Collection.extend({
      url: "fields",
      model: App.Field,
      comparator: function(model) {
        return model.get('order');
      }
    });

    App.AnswerFieldsList = App.FieldsList.extend({
      url: function(){
          var base = "answer_fields";
          if(App.viewAs){
            return base + "/" + App.viewAs;
          }
          return base;
      }
    });

    App.Question = Backbone.Model.extend({
      idAttribute: "uuid",
      initialize: function(){
        this.template = App.Templates.compiled.question;
      },
      defaults: function(){
        var def = {
          name:  "the first!"//,
        };
        return def;
      },
      genUUID: function(){
        this.set("uuid", new Date().getTime());
      }
    });

  });
})(jQuery);
