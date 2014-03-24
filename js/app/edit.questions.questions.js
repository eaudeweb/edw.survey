/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = window.edw.survey.edit.questions;

    var templates = [
      {"name": "question", "target": "#question-template"}
    ];
    _.each(templates, function(val){
      App.Templates.sources.push(val);
    });

    App.Question = App.Question.extend({
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
      localStorage: new Backbone.LocalStorage("QuestionListEdit")
    });

    App.QuestionView = Backbone.View.extend({
      tagName: "li",
      model: null,

      events: {
        "click .delete-question": "deleteQuestion"
      },

      initialize: function(){
        Backbone.View.prototype.initialize.apply(this);


        this.$el.droppable({
          hoverClass: "question-droppable",
          drop: _.bind(this.drop, this),
          tolerance: "pointer"
        });

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
        var fieldType = field.get("type");
        var viewer = App.FieldMapping[fieldType].viewer;
        var view = new viewer({model: field});
        $(".question-body", this.$el).append(view.render().el);
      },

      deleteQuestion: function(){
        this.model.destroy();
      },

      drop: function(event, ui){
        var elem = $(ui.draggable);
        var data = elem.data("backbone-view");
        var new_data = data;
        var cid = data.get("question_cid");
        if (cid !== ""){
          var question = App.application.getQuestion(cid);
          question.removeField(data);
        }
        new_data.set("question_cid", this.model.cid);
        this.model.addField(new_data);
      }

    });
  });
})(jQuery);
