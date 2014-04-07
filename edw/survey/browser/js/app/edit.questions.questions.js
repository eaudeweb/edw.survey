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

    App.QuestionList = Backbone.Collection.extend({
      url: "questions",
      model: App.Question//,
      //localStorage: new Backbone.LocalStorage("QuestionListEdit")
    });

    App.QuestionView = Backbone.View.extend({
      tagName: "li",
      model: null,

      events: {
        "click .delete-question": "deleteQuestion",
        "dblclick .panel-heading": "startEdit",
        "click .btn-question-save": "endEdit",
        "click .btn-question-cancel": "cancelEdit",
        "keyup .name-grabber": "handleKeyUp",
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
        this.listenTo(App.application.fields, "change reset add remove", this.render);
      },

      render: function(){
        this.$el.html(this.model.template(this.model.attributes));
        var fields = App.application.fields.where({parentID: this.model.get("uuid")});
        _.each(fields, function(field){
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
      
      startEdit: function(){
        this.input = this.$(".edit-mode .name-grabber");
        this.$el.find(".panel").addClass("editing");
        this.input.focus();
      },

      endEdit: function(){
        this.$el.find(".panel").removeClass("editing");
        this.model.set({name: this.input.val()}).save();
      },

      cancelEdit: function() {
        this.$el.find(".panel").removeClass("editing");
      },

      handleKeyUp: function(e) {
        var code = e.keyCode || e.which;

        if(code == 13) {
         this.endEdit();
        } else if(code == 27) {
          this.cancelEdit();
        }
      },

      removeField: function(data){
        App.application.fields.findWhere(data.toJSON()).destroy();
      },

      addField: function(model){
        App.application.fields.add(model).save();
      },

      drop: function(event, ui){
        var elem = $(ui.draggable);
        var data = elem.data("backbone-view");
        var field = new App.Field(data.toJSON());
        var parentID = field.get("parentID");
        if (parentID){
          this.removeField(data);
        }
        field.set("parentID", this.model.get("uuid"));
        if (!field.get("uuid")){
          field.genUUID();
        }
        this.addField(field);
      }

    });
  });
})(jQuery);
