/*global Backbone */


(function($){
  $(document).ready(function(){


    if(window.edw === undefined) { window.edw = { version: "1.0" }; }
    var edw = window.edw;
    if(edw.survey === undefined) { edw.survey = {}; }
    if(edw.survey.edit === undefined) { edw.survey.edit = {}; }


    edw.survey.edit.questions = {
      Templates: {
        sources: [
          {"name": "FieldTemplate", "target": "#Field-template"}
        ]
      }
    };

    var App = edw.survey.edit.questions;

    App.QuestionsView = Backbone.View.extend({
      el: $("#workshop ul#questions-listing"),
      collection: null,
      initialize: function(){
        this.collection = new App.QuestionList();
      },

      render: function(){
        if (_.isEmpty(this.collection)) {
          return;
        }
        this.collection.each(function(question){
          this.renderOne(question);
        }, this);
      },
      renderOne: function(question){
        var view = new App.QuestionView({model: question});
        this.$el.append(view.render().el);
      }
    });

    App.FieldsView = Backbone.View.extend({
      el: $("#sidebar ul#fields-listing"),
      collection: null,
      initialize: function(){
        this.collection = new App.FieldsList();
        this.collection.add([
          new App.Field({type: "textInputField", value: "TEXT INPUT"}),
          new App.Field({type: "richTextBlockField", value: "RICH TEXT BLOCK", uuid: null}),
          new App.Field({type: "textBlockField", value: "TEXT BLOCK"}),
          new App.Field({type: "labelField", value: "LABEL FIELD"}),
          new App.Field({type: "selectField", value: "option1\noption2\noption3"}),
          new App.Field({type: "radioField", fieldType: "radio", value: "I LIKE", group: "group1"}),
          new App.Field({type: "checkboxField", fieldType: "checkbox", value: "I LIKE", group: "group1"}),
          new App.Field({type: "tableLayout", rows: 3, cols: 3})
          ]);

        this.listenTo(this.collection, "change", this.render);
      },
      render: function(){
        this.$el.empty();
        this.collection.each(function(field){
          var fieldType = field.get("type");
          var viewer = App.FieldMapping[fieldType].viewer;
          var view = new viewer({model: field});
          this.$el.append(view.render().el);
          view.initDraggable();
        }, this);
      }
    });


    App.AppView = Backbone.View.extend({

      el: $("#application"),

      initialize: function(){
        this.sidebar = $("#sidebar");
        this.workshop = $("#workshop");

        this.fieldsView = new App.FieldsView();
        this.questionsView = new App.QuestionsView();
        this.questionsView.collection.fetch();
        this.fields = new App.FieldsList();

        $.when(this.fields.fetch(), this.questionsView.collection.fetch()).then(_.bind(function(){
          this.listenTo(this.questionsView.collection, 'add', this.displayQuestion);
          this.listenTo(this.questionsView.collection, "remove", this.fieldCleanup);
          this.listenTo(this.fields, "remove", this.fieldCleanup);
          this.render();
        }, this));
      },

      events: {
        "click #add-question": "addQuestion",
        "click #clear-data": "clearData",
        "click #save-view": "saveQuestions"
      },
      render: function(){
        this.questionsView.render();
        this.fieldsView.render();
      },

      addQuestion: function(){
        var length = this.questionsView.collection.length + 1;
        var question = this.questionsView.collection.create({
          uuid: new Date().getTime(),
          name: 'Question ' + length
        });
      },

      clearData: function(){
        //window.localStorage.clear();
        window.location.reload();
      },

      getQuestion: function(uuid){
        return this.questionsView.collection.findWhere({ uuid: uuid });
      },

      displayQuestion: function(question){
        this.questionsView.renderOne(question);
      },

      saveQuestions: function(evt, ui) {
        evt.preventDefault();
        var that = this;

        this.questions = $('.question');
        var deferreds = [];
        this.questions.each(function (index, question) {
          var fields = $(question).find('.question-body').find('> li');
      
          $.each(fields, function(idx, field){
            var uuid = parseInt($(field).attr('uuid'), 10);
            if (uuid) {
              var model = that.fields.findWhere({uuid: uuid});
              deferreds.push(
                model.set('order', idx).save());
            }
          });
        });
        $.when.apply($, deferreds).done(function(){
          window.location = 'view';
        });
      },

      fieldCleanup: function(question){
        var uuid = question.get("uuid");
        var questionFields = App.application.fields.where({parentID: uuid});
        _.each(questionFields, function(field){
          field.destroy();
        });
      }

    });

    $.ajax({
      url: "++resource++edw.survey.static/js/templates/edit.questions.tmpl",
      success: function(response){
        App.Templates.load(response);
        App.FieldMapping.init();
        App.application = new App.AppView();
      }
    });
  });
})(jQuery);
