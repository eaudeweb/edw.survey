/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = window.edw.survey.edit.questions;

    tinyMCE.baseURL="/++resource++edw.survey.static/js/lib/tinymce/js/tinymce";
    tinymce.suffix = ".min";


    App.FieldView = Backbone.View.extend({
      tagName: "li",
      className: "question-field",

      events: {
        "click .glyphicon-trash": "deleteField",
        "click .glyphicon-edit": "startEdit",
        "dblclick .view-mode": "startEdit",
        "click .glyphicon-check": "endEdit",
        "keydown .value-grabber": "handleKeyDown",
        //"blur .value-grabber": "cancelEdit"
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
            ret.addClass('dropped');
            return ret;
          },
          connectWith: '.ui-draggable',
          connectToSortable: '.question-body, .sortable-cell, .sortable-list'
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
        this.model.set({value: this.input.val()}).save();
        this.cancelEdit();
      },

      cancelEdit: function(){
        this.$el.removeClass("editing");
      },

      getCaret: function(el){
        if (el.selectionStart) {
          return el.selectionStart;
        } else if (document.selection) {
          el.focus();

          var r = document.selection.createRange();
            if (r == null) {
              return 0;
          }

          var re = el.createTextRange(),
          rc = re.duplicate();
          re.moveToBookmark(r.getBookmark());
          rc.setEndPoint('EndToStart', re);

          return rc.text.length;
        }
      return 0;
      },

      handleKeyDown: function(evt) {
        var code = evt.keyCode || evt.which;
        if (code == 13 && evt.shiftKey) {
          evt.stopPropagation();
          var textarea = this.$el.find('textarea');
          if (textarea.length > 0) {
           var content = textarea.val();
           var caret = this.getCaret(textarea);
           textarea.value = content.substring(0,caret)+
                         "\n"+content.substring(caret,content.length);
          }
          evt.stopPropagation();
        } else if(code == 13) {
          evt.stopPropagation();
          this.endEdit();
        } else if(code == 27) {
          this.cancelEdit();
        }
      },

      render: function(){
        var modelTemplate = this.model.renderTemplate();
        this.$el.html(this.template({data: this.model.attributes}));
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
            ui.item.addClass('dropped');
          },
        });
      },

      receive: function(evt, ui){
        var elem = $(evt.target).find('.dropped');
        this.fields = App.application.fields;
        var that = this;
        var data = elem.data("backbone-view");
        var existing = false;

        field = this.fields.findWhere({uuid: data.attributes.uuid});
        if (!field) {
          field = new App.Field(data.toJSON());
        } else {
          existing = true;
        }

        var rowIndex = evt.target.parentNode.rowIndex;
        var columnIndex = evt.target.cellIndex;

        field.set("rowPosition", rowIndex);
        field.set("columnPosition", columnIndex);

        field.set("parentID", this.model.get("uuid"));
        field.set("order", elem.index());

        if (!field.get("uuid")){
          field.set("uuid", new Date().getTime());
        }
        if (!existing) {
          this.fields.create(field);
        } else {
          field.save();
        }

        this.render();
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
          $(view.render().el).attr('uuid', field.get('uuid'));
        }, this);
        return this;
      }

    });

    App.RowLayoutView = App.FieldView.extend({
      events: {
        "click .rowLayout.glyphicon-trash": "deleteField",
        "click .rowLayout.glyphicon-edit": "startEdit",
        "click .rowLayout.glyphicon-check": "endEdit",
      },

      initialize: function(){
        App.FieldView.prototype.initialize.apply(this);
        this.fields = App.application.fields;
        this.listenTo(this.fields, "change", function(){
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

      bindSortable: function(){
        this.$el.find(".sortable-list").sortable({
          items: "li",
          receive: _.bind(this.receive, this),
          stop: _.bind(this.stop, this),
          placeholder: "highlight",
          helper: "original",
          tolerance: "pointer",
          connectWith: ['.question-body', '.sortable-list'],
          start: function(event, ui) {
            ui.item.data("backbone-view", ui.helper.data("backbone-view"));
            ui.item.addClass('dropped');
          },
        });
      },

      stop: function(evt, ui){
        var idx = ui.item.parent().children().index(ui.item);
        var previous = ui.item.prevAll();
        var after = ui.item.nextAll();

        var field = App.application.fields.findWhere({uuid: parseInt(ui.item.attr("uuid"))});
        field.set("order", idx).save();

        for (var i = 0; i < after.length; i++){
          field = App.application.fields.findWhere({uuid: parseInt($(after[i]).attr("uuid"))});
          field.set("order", i + idx + 1).save();
        }

        for (var j = 0; j < previous.length; j++){
          field = App.application.fields.findWhere({uuid: parseInt($(previous[j]).attr("uuid"))});
          field.set("order",(idx - (j + 1))).save();
        }
      },

      receive: function(evt, ui){
        var elem = $(evt.target).find('.dropped');
        this.fields = App.application.fields;
        var that = this;
        var data = elem.data("backbone-view");
        var existing = false;

        field = this.fields.findWhere({uuid: data.attributes.uuid});
        if (!field) {
          field = new App.Field(data.toJSON());
        } else {
          existing = true;
        }

        field.set("parentID", this.model.get("uuid"));
        field.set("row", 0);
        field.set("order", elem.index());
        field.view = data;

        if (!field.get("uuid")){
          field.set("uuid", new Date().getTime());
        }
        if (!existing) {
          this.fields.create(field);
        } else {
          field.save();
        }

        elem.attr("uuid", field.get("uuid"));
        elem.data("backbone-model", field);
        this.render();
      },

      render: function(){
        var modelTemplate = this.model.renderTemplate();
        this.$el.html(this.template({data: this.model.attributes}));
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());

        this.bindSortable();

        var list = this.$el.find(".sortable-list");
        var fields = this.fields.where({"parentID": this.model.get("uuid")});
        _.each(fields, function(field){
          var fieldType = field.get("type");
          var viewer = App.FieldMapping[fieldType].viewer;
          var view = new viewer({model: field});
          var el = $(view.render().el);
          el.data("backbone-model", field);
          $(list).append(el);
          $(view.render().el).attr('uuid', field.get('uuid'));
        }, this);
        return this;
      }

    });

  });
})(jQuery);
