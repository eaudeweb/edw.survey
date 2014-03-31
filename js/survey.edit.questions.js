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
        this.collection.fetch();

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
          new App.Field({type: "textField", value: "TEXT FIELD"}),
          new App.Field({type: "labelField", value: "LABEL FIELD"}),
          new App.Field({type: "tableLayout", rows: 3, cols: 3})
          ]);
      },
      render: function(){
        this.collection.each(function(field){
          var fieldType = field.get("type");
          var viewer = App.FieldMapping[fieldType].viewer;
          var view = new viewer({model: field});
          this.$el.append(view.render().el);
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
        this.fields = new App.FieldsList();
        this.fields.fetch();

        this.listenTo(this.questionsView.collection, 'add', this.displayQuestion);
        this.listenTo(this.questionsView.collection, "remove", this.fieldCleanup);
        this.listenTo(this.fields, "remove", this.fieldCleanup);
      },

      events: {
        "click #add-question": "addQuestion",
        "click #clear-data": "clearData"
      },

      render: function(){
        this.questionsView.render();
        this.fieldsView.render();
      },

      addQuestion: function(){
        var question = this.questionsView.collection.create({
          uuid: new Date().getTime()
        });
      },

      clearData: function(){
        window.localStorage.clear();
        window.location.reload();
      },

      getQuestion: function(uuid){
        return this.questionsView.collection.findWhere({ uuid: uuid });
      },

      displayQuestion: function(question){
        this.questionsView.renderOne(question);
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
      url: "./templates/edit.questions.tmpl",
      success: function(response){
        App.Templates.load(response);
        App.FieldMapping.init();
        App.application = new App.AppView();
        App.application.render();
      }
    });
  });
})(jQuery);
