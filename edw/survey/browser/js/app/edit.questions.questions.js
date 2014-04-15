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
        "keyup .name-grabber": "handleKeyUp"
      },

      initialize: function(){
        Backbone.View.prototype.initialize.apply(this);
        // this.render();
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(this.model, "change", this.render);
        console.log(App.application.fields);
        this.listenTo(App.application.fields, "change reset add", this.renderField);
        this.listenTo(App.application.fields, "remove", this.removeField);

        // this.listenTo(App.application.fields, "change reset add remove", this.render);
        // this.listenTo(App.application.fields, "add", this.renderField);
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
          }
        });
      },

      renderField: function(field){
        var fieldType = field.get("type");
        var viewer = App.FieldMapping[fieldType].viewer;
        var view = new viewer({model: field});
        console.log(field);
        // $(".question-body", this.$el).append(view.render().el);
        // var question = $(".question-body", this.$el);
        var question = this.$el.find('[question-id=' + field.get('parentID') + ']');
        var index = field.get("order");
        var added = question.find('[data-created=' + field.get('created') + ']');
        if (added.length === 0) {
          var idx_elem = question.find('li:eq(' + (index - 1) + ')');
          if (idx_elem.length > 0){
            idx_elem.after(view.render().el);
          } else {
            question.append(view.render().el);
          }
          $(view.render().el).attr('uuid', field.get('uuid'));
          $(view.render().el).attr('data-created', field.get('created'));
        }
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
        var question = this.$el.find('[question-id=' + data.get('parentID') + ']');
        var elem = question.find('[data-created=' + data.get('created') + ']');
        elem.remove();
        // App.application.fields.findWhere(data.toJSON()).destroy();
      },

      addField: function(model){
        // App.application.fields.add(model).save();
        App.application.fields.add(model);
      },

      receive: function(event, ui){
        var elem = $(ui.item);
        this.fields = App.application.fields;
        var that = this;
        var data = elem.data("backbone-view");
        var order = 0;
        var uuid;
        if (data) {
          uuid = data.attributes.uuid;
        } else {
          uuid = parseInt($(elem).attr('uuid'), 10);
        }

        field = this.fields.findWhere({uuid: uuid});
        if (field) {
          this.fields.remove(field);
        } else {
          field = new App.Field(data.toJSON());
        }

        if (elem.hasClass('question-field')) {
          order = elem.index();
        } else {
          order = $(event.target).find('.ui-draggable').index();
        }
        var created = parseInt(elem.attr('data-created'), 10);
        field.set("parentID", this.model.get("uuid"));
        field.set("created", created);
        field.set("order", order);
        if (!field.get("uuid")){
          field.genUUID();
        }
        console.log('INDEXING');
        // this.q_fields = $(event.target).parents('.question').find('li:not([data-created=' + created + '])');
        this.q_fields = $(event.target).parents('.question').find('li');
        this.q_fields.each(function (index, field) {
          var date_created = parseInt($(field).attr('data-created'), 10);
          if (date_created && date_created !== created) {
            var model = that.fields.findWhere({created: date_created});
            model.set('order', index);
            console.log(model);
            console.log('type: ', model.get('type'), 'order: ', index);
          }
        });
        console.log('Done indexing');
        console.log(order);
        this.addField(field);
      },

      saveFields: function(event, ui){
        var that = this;
        this.fields = App.application.fields;
        this.q_fields = $(event.target).parents('.question').find('li');

        this.q_fields.each(function (index, field) {
          var created = parseInt($(field).attr('data-created'), 10);
          if (created) {
            var model = that.fields.findWhere({created: created});
            model.set('order', index).save();
            console.log(model);
            console.log('type: ', model.get('type'), 'order: ', index, 'comparator: ', model.get('parentID') + model.get('order'));
          }
        });
        console.log('FIELDS', this.fields);
        // this.fields.each(function(model, index){
        //   model.save();
        // });
        // this.fields.sync();
        // this.fields.sort({silent: true});
        // this.render();
      }
    });
  });
})(jQuery);
