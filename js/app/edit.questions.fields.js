/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = window.edw.survey.edit.questions;

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
        var question = App.application.getQuestion(this.model.get("question_cid"));
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
        var question = App.application.getQuestion(this.model.get("question_cid"));
        question.get("fields").remove(this.model.toJSON());
        this.model.destroy();
        question.save();
      },

      dragStart: function(dataTransfer, e){
        return this.model;
      }

    });

  });
})(jQuery);
