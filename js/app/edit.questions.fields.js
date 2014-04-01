/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = window.edw.survey.edit.questions;

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

        this.initDraggable();

        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
      },

      initDraggable: function(){
        this.$el.draggable({
          handle: ".glyphicon-th",
          revert: true,
          helper: "clone"
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
        this.$el.html(this.template(this.model.attributes));
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());
        $(".edit-mode .contents", this.$el).html($(modelTemplate).filter(".edit-mode").html());
        return this;
      },

      deleteField: function(){
        App.application.fields.get(this.model).destroy();
      }

    });

    App.RadioFieldView = App.FieldView.extend({

      endEdit: function(){
        var name = this.$('.edit-mode .name-grabber');
        this.model.set({name: name.val()}).save();
        App.FieldView.prototype.endEdit.apply(this);
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
        this.listenTo(this.fields, "change", this.cleanupFields);
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
        //this.cleanupFields();
        this.render();
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

      bindDroppable: function(){
        this.$el.find("td").droppable({
          hoverClass: "tableLayout-droppable",
          accept: "#fields-listing .ui-draggable",
          greedy: true,
          tolerance: "pointer",
          drop: _.bind(this.drop, this)
        });
      },

      drop: function(evt, ui){
        var elem = $(ui.draggable);
        var data = elem.data("backbone-view");
        var new_data = data.toJSON();
        var rowIndex = evt.target.parentNode.rowIndex;
        var columnIndex = evt.target.cellIndex;
        new_data.rowPosition = rowIndex;
        new_data.columnPosition = columnIndex;
        new_data.parentID = this.model.get("uuid");
        if (!new_data.uuid){
          new_data.uuid = new Date().getTime();
        }
        this.fields.create(new_data);
        this.fields.fetch();
        this.render();
      },

      render: function(){
        var modelTemplate = this.model.renderTemplate();
        this.$el.html(this.template(this.model.attributes));
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());

        this.bindDroppable();

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
