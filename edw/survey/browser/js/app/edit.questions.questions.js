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
        "click .save-question": "saveFields",
        "dblclick .panel-heading": "startEdit",
        "click .btn-question-save": "endEdit",
        "click .btn-question-cancel": "cancelEdit",
        "keyup .name-grabber": "handleKeyUp",
      },

      initialize: function(){
        Backbone.View.prototype.initialize.apply(this);

        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(this.model, "change", this.render);
        this.listenTo(App.application.fields, "change reset add remove", this.render);
      },

      render: function(){
        this.$el.html(this.model.template({data: this.model.attributes}));
        this.bindIt();
        var fields = App.application.fields.where({parentID: this.model.get("uuid")});
        _.each(fields, function(field){
          this.renderField(field);
        }, this);
        this.$el.find('.question-body').attr('question-id', this.model.get('uuid'));
        this.$el.find('li').addClass('question-field');
        return this;
      },

      bindIt: function(){
        this.$el.find('.question-body').sortable({
          items: "li",
          receive: _.bind(this.receive, this),
          placeholder: "highlight",
          helper: "original",
          connectWith: '.question-body, .sortable-cell',
          start: function(event, ui) {
            ui.item.data("backbone-view", ui.helper.data("backbone-view"));
          },
        });
      },

      renderField: function(field){
        var fieldType = field.get("type");
        var viewer = App.FieldMapping[fieldType].viewer;
        var view = new viewer({model: field});
        $(".question-body", this.$el).append(view.render().el);
        $(view.render().el).attr('uuid', field.get('uuid'));
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

      receive: function(event, ui){
        var elem = $(ui.item);
        this.fields = App.application.fields;
        var that = this;
        var data = elem.data("backbone-view");
        if (data) {
          var uuid = data.attributes.uuid;
        } else {
          var uuid = parseInt($(elem).attr('uuid'));
        }

        field = this.fields.findWhere({uuid: uuid});
        if (field) {
          this.fields.remove(field);
        } else {
          field = new App.Field(data.toJSON());
        }

        field.set("parentID", this.model.get("uuid"));
        field.set("order", elem.index());
        if (!field.get("uuid")){
          field.genUUID();
        }
        this.addField(field);
      },

      saveFields: function(event, ui){
        var that = this;
        this.fields = App.application.fields;
        this.q_fields = $(event.target).parents('.question').find('li')
        this.q_fields.each(function (index, field) {
          var uuid = parseInt($(field).attr('uuid'));
          if (uuid) {
            var model = that.fields.findWhere({uuid: uuid});
            console.log(index);
            model.set('order', index).save();
          }
        });
        this.fields.sort({silent: true});
        this.render();
      }
    });
  });
})(jQuery);
