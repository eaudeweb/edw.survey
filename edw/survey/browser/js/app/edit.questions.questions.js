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
        "blur .name-grabber": "cancelEdit",
        "keydown .name-grabber": "handleKeyDown"
      },

      initialize: function(){
        Backbone.View.prototype.initialize.apply(this);

        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(this.model, "change", this.render);
        this.listenTo(App.application.fields, "change reset add", this.renderField);
        this.listenTo(App.application.fields, "remove", this.removeField);
      },

      render: function(){
        this.$el.html(this.model.template({data: this.model.attributes}));
        this.bindIt();

        var fields = App.application.fields.where({parentID: this.model.get("uuid")});
        _.each(fields, function(field){
          this.renderField(field);
        }, this);
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
            ui.item.addClass('dropped');
          }
        });
      },

      renderField: function(field){
        var fieldType = field.get("type");
        var viewer = App.FieldMapping[fieldType].viewer;
        var view = new viewer({model: field});

        var question = this.$el.find('[question-id=' + field.get('parentID') + ']');
        var index = field.get("order");
        var rendered = this.$el.find('[uuid=' + field.get('uuid') + ']');
        if (rendered.length > 0) {
          index = rendered.index();
          rendered.remove();
        }
        var idx_elem = question.find('> li:eq(' + (index) + ')');
        if (idx_elem.length > 0){
          idx_elem.before(view.render().el);
        } else {
          question.append(view.render().el);
        }
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

      handleKeyDown: function(evt) {
        var code = evt.keyCode || evt.which;

        if(code == 13) {
         this.endEdit();
        } else if(code == 27) {
          this.cancelEdit();
        }
      },

      removeField: function(data){
        var question = this.$el.find('[question-id=' + data.get('parentID') + ']');
        var elem = question.find('[uuid=' + data.get('uuid') + ']');
        elem.remove();
      },

      addField: function(model){
        App.application.fields.add(model);
      },

      receive: function(evt, ui){
        var elem = $(evt.target).find('.dropped');
        this.fields = App.application.fields;
        var that = this;
        var data = elem.data("backbone-view");
        var order = 0;

        field = this.fields.findWhere({uuid: data.attributes.uuid});
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

        elem.remove();
        this.addField(field);
      },

      saveFields: function(evt, ui){
        var that = this;
        this.fields = App.application.fields;
        this.q_fields = $(evt.target).parents('.question').find('.question-body').find('> li');

        this.q_fields.each(function (index, field) {
          var uuid = parseInt($(field).attr('uuid'), 10);
          if (uuid) {
            var model = that.fields.findWhere({uuid: uuid});
            model.set('order', index).save();
          }
        });
      }
    });
  });
})(jQuery);
