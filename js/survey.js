/*global Backbone */


(function($){
  $(document).ready(function(){


    if(window.edw === undefined) { window.edw = { version: "1.0" }; }
    var edw = window.edw;
    if(edw.survey === undefined) { edw.survey = {}; }
    if(edw.survey.edit === undefined) { edw.survey.edit = {}; }


    edw.survey.edit.questions = {
      Templates: {
        sources: [],
        compiled: {},
        load: function(data){
          var html = $(data);
          _.each(this.sources, function(value, key, list){
            this.compiled[value.name] = _.template(html.filter(value.target).html());
          }, this);
        }
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
        this.collection.add([new App.TextField(), new App.LabelField()]);
      },
      render: function(){
        this.collection.each(function(field){
          var view = new App.FieldView({model: field});
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

        this.listenTo(this.questionsView.collection, 'add', this.displayQuestion);
      },

      events: {
        "click #add-question": "addQuestion"
      },

      render: function(){
        this.questionsView.render();
        this.fieldsView.render();
      },

      addQuestion: function(){
        this.questionsView.collection.create();
      },

      displayQuestion: function(question){
        this.questionsView.renderOne(question);
      }
    });

    $.ajax({
      url: "./templates/survey.tmpl",
      success: function(response){
        App.Templates.load(response);
        App.FieldMapping.init();
        App.application = new App.AppView();
        App.application.render();
      }
    });
  });
})(jQuery);
