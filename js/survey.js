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

    var FieldMapping = {
      init: function(){
        this.labelField = LabelField;
        this.textField = TextField;
      }
    };

    var TextField = Backbone.Model.extend({
      defaults: function(){
        return {
          type: "textField",
          question_cid: ""
        };
      },
      initialize: function(){
        this.template = Templates.compiled.textField;
      }
    });

    var LabelField = Backbone.Model.extend({
      defaults: function(){
        return {
          type: "labelField",
          question_cid: ""
        };
      },
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
        var def = {
          name:  "the first!",
          fields: new FieldsList()
        };
        return def;
      },

      parse: function(response){
        var fields = new FieldsList();
        _.each(response.fields, function(val, idx, list){
          val.question_cid = this.cid;
          fields.add(new FieldMapping[val.type](val));
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

    var QuestionList = Backbone.Collection.extend({
      model: Question,
      localStorage: new Backbone.LocalStorage("survey-backbone")
    });

    var FieldView = Backbone.DragDrop.DraggableView.extend({
      tagName: "li",
      //className: "list-group-item",
      model: null,

      events: {
        "click .glyphicon-trash": "deleteField"
      },

      initialize: function(){
        Backbone.DragDrop.DraggableView.prototype.initialize.apply(this);
        this.listenTo(this.model, "destroy", this.remove);
      },

      render: function(){
        this.$el.html(this.model.template(this.model.attributes));
        return this;
      },

      deleteField: function(){
        var question = application.questionsView.collection.get(this.model.get("question_cid"));
        question.get("fields").remove(this.model.toJSON());
        this.model.destroy();
        question.save();
      },

      dragStart: function(dataTransfer, e){
        return this.model;
      }

    });

    var QuestionView = Backbone.DragDrop.DroppableView.extend({
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
        var view = new FieldView({model: field});
        $(".question-body", this.$el).append(view.render().el);
      },

      deleteQuestion: function(){
        this.model.destroy();
      },

      drop: function(data, dataTransfer, e){
        var new_data = data;
        var cid = data.get("question_cid");
        if (cid !== ""){
          var question = application.questionsView.collection.get(cid);
          question.removeField(data);
        }
        new_data.set("question_cid", this.model.cid);
        this.model.addField(new_data);
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

    var application = null;

    $.ajax({
      url: "./templates/survey.tmpl",
      success: function(response){
        Templates.load(response);
        FieldMapping.init();
        application = new AppView();
        application.render();
      }
    });
  });
})(jQuery);
