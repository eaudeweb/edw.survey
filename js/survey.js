(function($){
  $(document).ready(function(){

    var Templates = {
      sources: [
        {"name": "question", "target": "#question-template"},
        {"name": "labelField", "target": "#labelField-template"},
        {"name": "textField", "target": "#textField-template"}
      ],
      compiled: {},
      load: function(data){
        var html = $(data);
        _.each(this.sources, function(value, key, list){
          this.compiled[value.name] = _.template(html.filter(value.target).html());
        }, this);
      }
    };

    var TextField = Backbone.Model.extend({
      initialize: function(){
        this.template = Templates.compiled.textField;
      }
    });

    var LabelField = Backbone.Model.extend({
      initialize: function(){
        this.template = Templates.compiled.labelField;
      }
    });

    var FieldsList = Backbone.Collection.extend({
      localStorage: new Backbone.LocalStorage("survey-backbone")
    });

    var Question = Backbone.Model.extend({
      initialize: function(){
        this.template = Templates.compiled.question;
      },
      defaults: function(){
        this.title = "the first!";
        this.fields = new FieldsList();
      }
    });

    var QuestionList = Backbone.Collection.extend({
      model: Question,
      localStorage: new Backbone.LocalStorage("survey-backbone")
    });

    var FieldView = Backbone.View.extend({
      tagName: "li",
      model: null,
      render: function(){
        this.$el.html(this.model.template());
        return this;
      }
    });

    var QuestionView = Backbone.View.extend({
      tagName: "li",
      model: null,

      events: {
        "click .delete-question": "deleteQuestion"
      },

      initialize: function(){
        this.listenTo(this.model, 'destroy', this.remove);
      },

      render: function(){
        this.$el.html(this.model.template(this.model.toJSON()));
        return this;
      },

      deleteQuestion: function(){
        this.model.destroy();
      }

    });

    var QuestionsView = Backbone.View.extend({
      el: $("#workshop ul#questions-listing"),
      collection: null,
      initialize: function(){
        this.collection = new QuestionList();
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
        var view = new QuestionView({model: question});
        this.$el.append(view.render().el);
      }
    });

    var FieldsView = Backbone.View.extend({
      el: $("#sidebar ul#fields-listing"),
      collection: null,
      initialize: function(){
        this.collection = new FieldsList();
        this.collection.add([new TextField(), new LabelField()]);
      },
      render: function(){
        this.collection.each(function(field){
          var view = new FieldView({model: field});
          this.$el.append(view.render().el);
        }, this);
      }
    });


    var AppView = Backbone.View.extend({

      el: $("#application"),

      initialize: function(){
        this.sidebar = $("#sidebar");
        this.workshop = $("#workshop");

        this.fieldsView = new FieldsView();
        this.questionsView = new QuestionsView();

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
        Templates.load(response);
        var application = new AppView();
        application.render();
      }
    });
  });
})(jQuery);
