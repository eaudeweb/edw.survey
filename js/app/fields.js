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
          constructor: App.LabelField,
          viewer: App.FieldView
        };
        this.textField = {
          constructor: App.TextField,
          viewer: App.FieldView
        };
        this.tableLayout = {
          constructor: App.TableLayout,
          viewer: App.TableLayoutView
        };
      }
    };

    App.TextField = Backbone.Model.extend({
      defaults: function(){
        return {
          type: "textField",
          value: "TEXT FIELD",
          question_cid: ""
        };
      },
      initialize: function(){
        this.template = App.Templates.compiled.textField;
      }
    });

    App.LabelField = Backbone.Model.extend({
      defaults: function(){
        return {
          type: "labelField",
          value: "LABEL FIELD",
          question_cid: ""
        };
      },
      initialize: function(){
        this.template = App.Templates.compiled.labelField;
      }
    });

    App.TableLayout = Backbone.Model.extend({
      defaults: function(){
        return {
          type: "tableLayout",
          value: "TABLE LAYOUT",
          question_cid: ""
        };
      },
      initialize: function(){
        this.template = App.Templates.compiled.tableLayout;
      },

      startEdit: function(){
        console.log("aaaa");
      }
    });

  });
})(jQuery);
