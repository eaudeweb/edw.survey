/*global Backbone _ jQuery document*/

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
      {"name": "textInputField", "target": "#textInputField-template"},
      {"name": "textBlockField", "target": "#textBlockField-template"},
      {"name": "richTextBlockField", "target": "#richTextBlockField-template"},
      {"name": "selectField", "target": "#selectField-template"},
      {"name": "radioField", "target": "#checkboxField-template"},
      {"name": "checkboxField", "target": "#checkboxField-template"},
      {"name": "tableLayout", "target": "#tableLayout-template"}
    ];
    _.each(templates, function(val){
      App.Templates.sources.push(val);
    });

    App.FieldMapping =  {
      init: function(){
        this.labelField = {
          viewer: App.FieldView,
          valueGetter: function(){ return false; }
        };
        this.richTextBlockField = {
          viewer: App.RichTextBlockFieldView,
          valueGetter: function(){ return false; }
        };
        this.textBlockField = {
          viewer: App.FieldView,
          valueGetter: function(){ return false; }
        };
        this.textInputField = {
          viewer: App.FieldView,
          valueGetter: function(elem){
            return elem.find("input").val();
          }
        };
        this.textField = {
          viewer: App.FieldView,
          valueGetter: function(){ return false; }
        };
        this.selectField = {
          viewer: App.FieldView,
          valueGetter: function(elem){
            return elem.find("select").val();
          }
        };
        this.radioField = {
          viewer: App.CheckboxFieldView,
          valueGetter: function(elem){
            var input = elem.find("input");
            var value;
            if (input.is(":checked")){
              value = input.val();
            } else {
              value = false;
            }
            return value;
          }
        };
        this.checkboxField = {
          viewer: App.CheckboxFieldView,
          valueGetter: function(elem){
            var input = elem.find("input");
            var value;
            if (input.is(":checked")){
              value = input.val();
            } else {
              value = false;
            }
            return value;
          }
        };
        this.tableLayout = {
          viewer: App.TableLayoutView,
          valueGetter: function(){ return false; }
        };
      }
    };

    App.Field = Backbone.Model.extend({
      idAttribute: "uuid",
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
        return App.Templates.compiled[this.get("type")]({data: this.attributes});
      }
    });
  });
})(jQuery);
