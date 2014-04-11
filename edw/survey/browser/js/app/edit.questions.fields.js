/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = window.edw.survey.edit.questions;

    tinyMCE.baseURL="/++resource++edw.survey.static/js/lib/tinymce/js/tinymce";
    tinymce.suffix = ".min";


    App.FieldView = Backbone.View.extend({
      tagName: "li",
      //className: "list-group-item",

      events: {
        "click .glyphicon-trash": "deleteField",
        "click .glyphicon-edit": "startEdit",
        "click .glyphicon-check": "endEdit"
      },

      initialize: function(){
        this.template = App.Templates.compiled.FieldTemplate;

        this.$el.data('backbone-view', this.model);
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
      },

      initDraggable: function(){
        this.$el.draggable({
          handle: ".glyphicon-th",
          revert: false,
          helper: function() {
            var data = $(this).data("backbone-view");
            var ret = $(this).clone();
            ret.data("backbone-view", data);
            return ret;
          },
          connectWith: '.ui-draggable',
          connectToSortable: '.question-body, .sortable-cell'
        });
        this.$el.data("backbone-view", this.model);
      },

      startEdit: function(){
        this.input = this.$('.edit-mode .value-grabber');
        this.$el.addClass("editing");
        this.input.focus();
      },

      getParent: function(){
        var question = App.application.getQuestion(this.model.get("parentID"));
        return question;
      },

      endEdit: function(){
        this.$el.removeClass("editing");
        this.model.set({value: this.input.val()}).save();
      },

      render: function(){
        var modelTemplate = this.model.renderTemplate();
        this.$el.html(this.template({data: this.model.attributes}));
        // this.$el.data('backbone-view', this.model);
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());
        $(".edit-mode .contents", this.$el).html($(modelTemplate).filter(".edit-mode").html());
        return this;
      },

      deleteField: function(){
        App.application.fields.get(this.model).destroy();
      }

    });

    App.CheckboxFieldView = App.FieldView.extend({

      startEdit: function(){

        var formatter = function(option){
          return '<div class="group-color group-color-chooser '+ option.id +'"></div>';
        };

        this.$("select.group-grabber").select2({
          formatResult: formatter,
          formatSelection: formatter,
          escapeMarkup: function(m) { return m; }
        });
        App.FieldView.prototype.startEdit.apply(this);
      },

      endEdit: function(){
        var group = this.$('.edit-mode select.group-grabber');
        this.model.set({group: group.val()}).save();

        var fieldslist = App.application.fieldsView.collection;
        var field = fieldslist.findWhere({type: this.model.get("type")});
        field.set("group", this.model.get("group"));

        App.FieldView.prototype.endEdit.apply(this);
      },

      render: function(){
        App.FieldView.prototype.render.apply(this);
        this.$el.addClass("group-color");
        this.$el.addClass(this.model.get("group"));
        return this;
      }

    });

    App.RichTextBlockFieldView = App.FieldView.extend({

      initialize: function(){
        App.FieldView.prototype.initialize.apply(this);
      },

      startEdit: function(){
        this.$el.addClass("editing");
        this.tinyMCEInit();
      },

      render: function(){
        var modelTemplate = this.model.renderTemplate();
        this.$el.html(this.template({data: this.model.attributes}));
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());
        $(".edit-mode .contents", this.$el).html($(modelTemplate).filter(".edit-mode").html());
        return this;
      },

      endEdit: function(){
        this.$el.removeClass("editing");
        var selector = this.model.get("type") + "-" + this.model.get("uuid");
        var tmceContent = tinyMCE.get(selector).getContent();
        this.model.set({value: tmceContent}).save();
        tinymce.remove();
      },

      tinyMCEInit: function(){
        var selector = "textarea#" + this.model.get("type") + "-" + this.model.get("uuid");
        if (this.model.get("uuid") !== null){
          tinymce.init({
            selector: selector,
            schema: "html5",
            plugins: "fullscreen code",
            toolbar: false,
            add_unload_trigger: false,
            removed_menuitems: "newdocument",
            statusbar: true
          });
        }
      }
    });

    App.TableLayoutView = App.FieldView.extend({

      events: {
        "click .tableLayout.glyphicon-trash": "deleteField",
        "click .tableLayout.glyphicon-edit": "startEdit",
        "click .tableLayout.glyphicon-check": "endEdit",
        "click .glyphicon-arrow-right": "addColumn",
        "click .glyphicon-arrow-left": "removeColumn",
        "click .glyphicon-arrow-down": "addRow",
        "click .glyphicon-arrow-up": "removeRow"
      },

      initialize: function(){
        App.FieldView.prototype.initialize.apply(this);
        this.fields = App.application.fields;
        this.listenTo(this.fields, "change", function(){
          this.cleanupFields();
          this.render();
        });
      },

      startEdit: function(){
        this.$el.addClass("editing");
      },

      endEdit: function(){
        this.$el.removeClass("editing");
        var question = App.application.getQuestion(this.model.get("parentID"));
        question.save();
      },

      adjustSize: function(dimension, amount){
        var dim = this.model.get(dimension);
        App.application.fields.get(this.model).set(dimension, dim + amount).save();
      },

      addColumn: function(){
        this.adjustSize("cols", 1);
      },

      removeColumn: function(){
        this.adjustSize("cols", -1);
      },

      addRow: function(){
        this.adjustSize("rows", 1);
      },

      removeRow: function(){
        this.adjustSize("rows", -1);
      },

      cleanupFields: function(){
        var rows = this.model.get("rows");
        var cols = this.model.get("cols");
        var fields = App.application.fields.where({
          parentID: this.model.get("uuid")
        });
        _.each(fields, function(field){
          var colPos = field.get("columnPosition") + 1;
          var rowPos = field.get("rowPosition") + 1;
          if (colPos > cols || rowPos > rows){
            App.application.fields.findWhere(field.toJSON()).destroy();
          }
        });
      },

      bindSortable: function(){
        this.$el.find(".sortable-cell").sortable({
          items: "li",
          receive: _.bind(this.receive, this),
          placeholder: "highlight",
          helper: "original",
          tolerance: "pointer",
          connectWith: '.question-body, .sortable-cell',
          start: function(event, ui) {
            ui.item.data("backbone-view", ui.helper.data("backbone-view"));
          },
        });
      },

      receive: function(evt, ui){
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
        var rowIndex = evt.target.parentNode.rowIndex;
        var columnIndex = evt.target.cellIndex;
        field.set("rowPosition", rowIndex);
        field.set("columnPosition", columnIndex);

        field.set("parentID", this.model.get("uuid"));
        field.set("order", elem.index());
        console.log("Index: ", elem.index());
        if (!field.get("uuid")){
          field.set("uuid", new Date().getTime());
        }

        this.fields.create(field);
      },

      render: function(){
        var modelTemplate = this.model.renderTemplate();
        this.$el.html(this.template({data: this.model.attributes}));
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());

        this.bindSortable();

        var table = this.$el.find("table").get(0);
        var fields = this.fields.where({"parentID": this.model.get("uuid")});
        _.each(fields, function(field){
          var fieldType = field.get("type");
          var viewer = App.FieldMapping[fieldType].viewer;

          var rowIndex = field.get("rowPosition");
          var columnIndex = field.get("columnPosition");

          var view = new viewer({model: field});
          $(table.rows[rowIndex].cells[columnIndex]).append(view.render().el);

        }, this);
        return this;
      }

    });

  });
})(jQuery);
