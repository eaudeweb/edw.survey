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
          var question = App.application.getQuestion(cid);
          question.removeField(data);
        }
        new_data.set("question_cid", this.model.cid);
        this.model.addField(new_data);
      }

    });
  });
})(jQuery);
