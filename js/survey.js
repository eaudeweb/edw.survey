(function($){
  $(document).ready(function(){


    if(window.edw === undefined) { window.edw = { version: "1.0" }; }
    var edw = window.edw;
    if(edw.survey === undefined) { edw.survey = {}; }
    if(edw.survey.edit === undefined) { edw.survey.edit = {}; }


    edw.survey.edit.questions = {
      Templates: {
        sources: [
          {"name": "question", "target": "#question-template"},
          {"name": "labelField", "target": "#labelField-template"},
          {"name": "textField", "target": "#textField-template"},
          {"name": "FieldTemplate", "target": "#Field-template"}
        ],
        compiled: {},
        load: function(data){
          var html = $(data);
          _.each(this.sources, function(value, key, list){
            this.compiled[value.name] = _.template(html.filter(value.target).html());
          }, this);
        }
      },

      FieldMapping: {
        init: function(){
          this.labelField = App.LabelField;
          this.textField = App.TextField;
        }
      }
    };
    var App = edw.survey.edit.questions;


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

    App.FieldsList = Backbone.Collection.extend({
      localStorage: new Backbone.LocalStorage("survey-backbone")
    });

    App.Question = Backbone.Model.extend({
      initialize: function(){
        this.template = App.Templates.compiled.question;
      },
      defaults: function(){
        var def = {
          name:  "the first!",
          fields: new App.FieldsList()
        };
        return def;
      },

      parse: function(response){
        var fields = new App.FieldsList();
        _.each(response.fields, function(val, idx, list){
          val.question_cid = this.cid;
          fields.add(new App.FieldMapping[val.type](val));
        }, this);
        response.fields = fields;
        return response;
      },

      removeField: function(data){
        this.get("fields").remove(data);
        this.save();
        this.trigger("change");
      },

      addField: function(model){
        this.get("fields").add(model);
        this.save();
      }
    });

    App.QuestionList = Backbone.Collection.extend({
      model: App.Question,
      localStorage: new Backbone.LocalStorage("survey-backbone")
    });

    App.FieldView = Backbone.DragDrop.DraggableView.extend({
      tagName: "li",
      //className: "list-group-item",
      model: null,
      template: null,

      events: {
        "click .glyphicon-trash": "deleteField",
        "click .glyphicon-edit": "startEdit",
        "blur .value-grabber, click .glyphicon-check": "endEdit"
      },

      initialize: function(){
        Backbone.DragDrop.DraggableView.prototype.initialize.apply(this);

        this.template = App.Templates.compiled.FieldTemplate;

        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
      },

      startEdit: function(){
        this.input = this.$('.edit-mode .value-grabber');
        this.$el.addClass("editing");
        this.input.focus();
      },

      endEdit: function(){
        this.$el.removeClass("editing");
        this.model.set({value: this.input.val()});
        var question = App.application.questionsView.collection.get(this.model.get("question_cid"));
        question.save();
      },

      render: function(){
        var modelTemplate = this.model.template(this.model.attributes);
        this.$el.html(this.template(this.model.attributes));
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());
        $(".edit-mode .contents", this.$el).html($(modelTemplate).filter(".edit-mode").html());
        return this;
      },

      deleteField: function(){
        var question = App.application.questionsView.collection.get(this.model.get("question_cid"));
        question.get("fields").remove(this.model.toJSON());
        this.model.destroy();
        question.save();
      },

      dragStart: function(dataTransfer, e){
        return this.model;
      }

    });

    App.QuestionView = Backbone.DragDrop.DroppableView.extend({
      tagName: "li",
      model: null,

      events: {
        "click .delete-question": "deleteQuestion"
      },

      initialize: function(){
        Backbone.DragDrop.DroppableView.prototype.initialize.apply(this);
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(this.model, "change", this.render);
      },

      render: function(){
        this.$el.html(this.model.template(this.model.attributes));
        var model_fields = this.model.get("fields");
        model_fields.each(function(field){
          this.renderField(field);
        }, this);
        return this;
      },

      renderField: function(field){
        var view = new App.FieldView({model: field});
        $(".question-body", this.$el).append(view.render().el);
      },

      deleteQuestion: function(){
        this.model.destroy();
      },

      drop: function(data, dataTransfer, e){
        var new_data = data;
        var cid = data.get("question_cid");
        if (cid !== ""){
          var question = App.application.questionsView.collection.get(cid);
          question.removeField(data);
        }
        new_data.set("question_cid", this.model.cid);
        this.model.addField(new_data);
      }

    });

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
