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
      {"name": "labelField", "target": "#labelField-template"},
      {"name": "textField", "target": "#textField-template"},
      {"name": "tableLayout", "target": "#tableLayout-template"}
    ];
    _.each(templates, function(val){
      App.Templates.sources.push(val);
    });

    App.FieldMapping =  {
      init: function(){
        this.labelField = {
          viewer: App.FieldView
        };
        this.textField = {
          viewer: App.FieldView
        };
        this.tableLayout = {
          viewer: App.TableLayoutView
        };
      }
    };

    App.Field = Backbone.Model.extend({
      fieldCopy: function(){
        var original = this;
        var copy = original;
        copy.genUUID();
        return copy;
      },
      genUUID: function(){
        this.set("uuid", new Date().getTime());
      },
      renderTemplate: function(){
        return App.Templates.compiled[this.get("type")](this.attributes);
      }
    });
  });
})(jQuery);
