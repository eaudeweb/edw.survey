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
    else if(window.edw.survey.edit.logic !== undefined) {
      App = window.edw.survey.edit.logic;
    }


    var templates = [
      {"name": "labelField", "target": "#labelField-template"},
      {"name": "textInputField", "target": "#textInputField-template"},
      {"name": "textBlockField", "target": "#textBlockField-template"},
      {"name": "richTextBlockField", "target": "#richTextBlockField-template"},
      {"name": "selectField", "target": "#selectField-template"},
      {"name": "radioField", "target": "#checkboxField-template"},
      {"name": "checkboxField", "target": "#checkboxField-template"},
      {"name": "tableLayout", "target": "#tableLayout-template"},
      {"name": "rowLayout", "target": "#rowLayout-template"}
    ];
    _.each(templates, function(val){
      App.Templates.sources.push(val);
    });

    App.FieldMapping =  {
      init: function(){
        this.labelField = {
          viewer: App.FieldView,
          getExtra: function(elem) { return {}; },
          valueGetter: function(){ return false; }
        };
        this.richTextBlockField = {
          viewer: App.RichTextBlockFieldView,
          getExtra: function(elem) {
            var data = elem.data("field-data");
            if(data.row)
              return {row: data.row};
            return {};
          },
          valueGetter: function(){ return false; }
        };
        this.textBlockField = {
          viewer: App.FieldView,
          getExtra: function(elem) {
            var data = elem.data("field-data");
            if(data.row)
              return {row: data.row};
            return {};
          },
          valueGetter: function(){ return false; }
        };
        this.textInputField = {
          viewer: App.FieldView,
          valueGetter: function(elem){
            return elem.find("input").val();
          },
          getExtra: function(elem) {
            var data = elem.data("field-data");
            if(data.row)
              return {row: data.row};
            return {};
          },
        };
        this.textField = {
          viewer: App.FieldView,
          valueGetter: function(){ return false; },
          getExtra: function(elem) {
            var data = elem.data("field-data");
            if(data.row)
              return {row: data.row};
            return {};
          },
        };
        this.selectField = {
          viewer: App.FieldView,
          getExtra: function(elem) {
            var data = elem.data("field-data");
            if(data.row)
              return {row: data.row};
            return {};
          },
          valueGetter: function(elem){
            return elem.find("select").val();
          }
        };
        this.radioField = {
          viewer: App.CheckboxFieldView,
          getExtra: function(elem) {
            var data = elem.data("field-data");
            if(data.row)
              return {row: data.row};
            return {};
          },
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
          getExtra: function(elem) {
            var data = elem.data("field-data");
            if(data.row)
              return {row: data.row};
            return {};
          },
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
          getExtra: function(elem) { return {}; },
          valueGetter: function(){ return false; }
        };
        this.rowLayout = {
          viewer: App.RowLayoutView,
          getExtra: function(elem) {
            var data = elem.data("field-data");
            return {rows: data.rows};
          },
          valueGetter: function() { return false; }
        };
      }
    };

    App.LogicMapping = {
      "radio": function(field, question) {
        if(!question.condition_field.isRadio())
          return false;

        if(!App.haveSameGroup(field, question.condition_field)) {
          return false;
        } else if(!App.haveSameUUID(field, question.condition_field)) {
            question.$el.fadeOut();
            return false;
        }

        return true;
      },
      "checkbox": function(field, question) {
        if(!question.condition_field.isCheckbox())
          return false;

        if(!App.haveSameGroup(field, question.condition_field)) {
          return false;
        } else if(!field.view.$el.find("input").is(":checked") &&
                       App.haveSameUUID(field, question.condition_field)) {
            question.$el.fadeOut();
            return false;
        }

        return true;
      },
    };

    App.Field = Backbone.Model.extend({
      idAttribute: "uuid",

      fieldCopy: function(){
        var original = this;
        var copy = original;
        copy.genUUID();
        return copy;
      },
      isRadio: function() {
        if(this.get("group"))
          if(this.get("fieldType") === "radio")
            return true;
        return false;
      },
      isCheckbox: function() {
        if(this.get("group"))
          if(this.get("fieldType") === "checkbox")
            return true;
        return false;
      },
      check: function(condition, question) {
        if(this.get("parentID") !== question.condition_field.get("parentID"))
          return;

        if(this.get("group") && !App.LogicMapping[this.get("fieldType")](this, question)) {
          return;
        }

        if(!App.haveSameUUID(question.condition_field, this)) {
          if(this.has("copyOf")) {
            var field = App.application.fields.findWhere({uuid: this.get("copyOf")});
            if(!App.haveSameUUID(question.condition_field, field))
              return;
          } else {
            return;
          }
        }

        var value = this.view.getValue();
        var flag = false;

        if(value) {
          if(condition.operator === "eq")
            flag = value === condition.cmp;

          if(condition.operator === "lt")
            flag = Number(value) < Number(condition.cmp);

          if(condition.operator === "gt")
            flag = Number(value) > Number(condition.cmp);

          if(condition.operator === "le")
            flag = Number(value) <= Number(condition.cmp);

          if(condition.operator === "ge")
            flag = Number(value) >= Number(condition.cmp);

          if(condition.operator === "contains")
            flag = value.indexOf(condition.cmp) !== -1;
        }
        if(flag){
          question.$el.fadeIn();
        } else {
          question.$el.fadeOut();
        }
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
