/*global Backbone document jQuery*/


(function($){
  $(document).ready(function(){


    if(window.edw === undefined) { window.edw = { version: "1.0" }; }
    var edw = window.edw;
    if(edw.survey === undefined) { edw.survey = {}; }
    if(edw.survey.view === undefined) { edw.survey.view = {}; }


    edw.survey.view = {
      Templates: {
        sources: [
        ]
      }
    };

    var App = edw.survey.view;

    App.QuestionList = Backbone.Collection.extend({
      url: "answer_questions",
      initialize: function(){
        this.model = App.Question;
      }
    });

    App.FieldView = Backbone.View.extend({
      tagName: "li",

      events: {
        "change": "announceKeypress",
        "keyup": "announceKeypress"
      },

      initialize: function(){
        this.model.view = this;
      },

      announceKeypress: function(){
        App.application.trigger("field-modified", this.model);
      },

      getValue: function(){
        var value = App.FieldMapping[this.model.get("type")].valueGetter(this.$el);
        return value;
      },

      render: function(){
        this.$el.html(this.model.renderTemplate());
        return this;
      }

    });

    App.CheckboxFieldView = App.FieldView.extend({});

    App.RichTextBlockFieldView = App.FieldView.extend({});

    App.RowLayoutView = App.FieldView.extend({
      events: {
        "click .glyphicon-plus": "addRow",
      },

      initialize: function(){
        App.FieldView.prototype.initialize.apply(this);
        this.fields = App.application.fields;
      },

      addRow: function(event) {
        var rowNumber = this.model.get("rows");
        this.model.set({rows:  rowNumber + 1});
        this.$el.data("field-data", this.model.toJSON());

        //save all fields
        _.each(this.$el.find(".survey-field"), function(field) {
          var model = $(field).data("field-data");

          var originalModel = this.fields.findWhere({uuid: model.uuid});
          var value = App.FieldMapping[model.type].valueGetter($(field));
          if(value)
            originalModel.set({value:  value});
        }, this);

        var row = $(event.target).parent().parent();
        var clone = row.clone();
        _.each(row.find(".survey-field"), function(field) {
          var model = $(field).data("field-data");
          var newModel = new App.Field(model);
          App.sleep(1);
          newModel.set({uuid: App.genUUID(), row: rowNumber});
          if(!_.has(model, "copyOf")) {
            newModel.set("copyOf", model.uuid);
          }
          this.fields.add(newModel);
        }, this);
        this.render();
      },

      render: function(){
        this.$el.html(this.model.renderTemplate());

        var rowNumber = 0;
        while(true) {
          var fields = this.fields.where({parentID: this.model.get("uuid"), row: rowNumber});
          if(fields.length === 0) break;

          var lineContainer = this.$el.find(".line").get(rowNumber);
          var view_list = $(lineContainer).find(".sortable-list").get(0);
          _.each(fields, function(field) {
            var fieldType = field.get("type");
            var viewer = App.FieldMapping[fieldType].viewer;
            var view = new viewer({model: field});

            var rendered_el = $(view.render().el);
            rendered_el.addClass("survey-field ");
            rendered_el.data("field-data", field.toJSON());

            $(view_list).append(rendered_el);
          }, this);

          rowNumber++;
        }

        return this;
      }
    });

    App.TableLayoutView = App.FieldView.extend({

      initialize: function(){
        App.FieldView.prototype.initialize.apply(this);
        this.fields = App.application.fields;
      },

      render: function(){
        this.$el.html(this.model.renderTemplate());

        var view_table = this.$el.find("table").get(0);
        var fields = this.fields.where({"parentID": this.model.get("uuid")});
        _.each(fields, function(field){
          var fieldType = field.get("type");
          var viewer = App.FieldMapping[fieldType].viewer;
          var view = new viewer({model: field});


          var rowIndex = field.get("rowPosition");
          var columnIndex = field.get("columnPosition");
          var rendered_el = $(view.render().el);
          rendered_el.addClass("survey-field ");
          rendered_el.data("field-data", field.toJSON());

          $(view_table.rows[rowIndex].cells[columnIndex]).append(rendered_el);

        }, this);

        return this;
      }
    });


    App.QuestionView = Backbone.View.extend({
      tagName: "li",
      model: null,

      listenForFields: function(field){
        this.displayIf(field);
      },

      checkCondition: function(){
        var condition = this.model.get("logic_condition");
        if(condition){
          this.$el.hide();
          this.listenTo(App.application, "field-modified", this.listenForFields);

          this.condition_field = App.application.fields.findWhere({uuid: parseInt(condition.field)});

          this.displayIf = function(field){
            field.check(condition, this);
          };

          App.application.fields.each(function(field){
            this.displayIf(field);
          }, this);

        }
      },

      render: function(){
        this.$el.data("backbone-view", this);
        this.$el.html(this.model.template({data: this.model.attributes}));
        var fields = App.application.fields.where({parentID: this.model.get("uuid")});
        _.each(fields, function(field){
          this.renderField(field);
        }, this);
        this.checkCondition();
        this.checkViewAs();
        return this;
      },

      renderField: function(field){
        var fieldType = field.get("type");
        var viewer = App.FieldMapping[fieldType].viewer;
        var view = new viewer({model: field});
        var rendered_view = view.render();
        var rendered_el = $(rendered_view.el);
        rendered_el.addClass("survey-field ");
        rendered_el.data("field-data", field.toJSON());
        rendered_el.data("backbone-view", view);
        $(".question-body", this.$el).append(rendered_el);
      },

      checkViewAs: function(){
        if(App.viewAs){
          $("#content .question .input-type-field").prop("disabled", true);
        }
      }
    });

    App.QuestionsView = Backbone.View.extend({
      el: $("#displayarea ul#questions-listing"),
      collection: null,

      render: function(){
        App.application.questions.each(function(question){
          this.renderOne(question);
        }, this);
      },
      renderOne: function(question){
        var view = new App.QuestionView({model: question});
        this.$el.append(view.render().el);
      }
    });

    App.viewAs = $.url().param("viewAs");

    App.AppView = Backbone.View.extend({

      el: $("#application"),

      initialize: function(){
        this.sidebar = $("#sidebar");
        this.workshop = $("#workshop");
      },

      render: function(){
        this.questionsView.render();
      },

      getQuestion: function(uuid){
        return this.questionsView.collection.findWhere({ uuid: uuid });
      },

      getAnswer: function(){
        var answer = {};
        var formfields = $(".survey-field");
        _.each(formfields, function(elem){
          var $elem = $(elem);
          var data = $elem.data("field-data");
          var value = App.FieldMapping[data.type].valueGetter($elem);
          var props = App.FieldMapping[data.type].getExtra($elem);
          answer[data.uuid] = {
            field: data,
            properties: props,
            answer: value
          };
        }, this);
        return answer;
      }
    });

    $.ajax({
      url: "++resource++edw.survey.static/js/templates/survey.tmpl",
      success: function(response){
        App.Templates.load(response);
        App.FieldMapping.init();
        App.application = new App.AppView();
        App.application.fields = new App.AnswerFieldsList();
        App.application.questions = new App.QuestionList();
        $.when(
          App.application.fields.fetch(),
          App.application.questions.fetch()).then(
            _.bind(function(){
              App.application.questionsView = new App.QuestionsView();
              App.application.render();
            }, this)
          );
        if (App.viewAs){
          var form = $("#survey-answer-form");
          var listing = $("#questions-listing");
          form.parent().append(listing);
          form.remove();
          var info = $('<div class="alert alert-info"></div>');
          info.html('<strong>Attention!</strong> You are currently viewing the survey as it appears for <strong>' + App.viewAs + '</strong>.');
          $("#application").prepend(info);
        }
        $("form[action='answer']").on("submit", function(evt){
          evt.preventDefault();
          var answer = App.application.getAnswer();
          $.ajax({
            url: "answer",
            cache: false,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(answer),
            success: function(response){
              window.location.reload();
            }
          });
          return false;
        });
      }
    });
  });
})(jQuery);
