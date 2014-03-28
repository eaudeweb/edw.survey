/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = window.edw.survey.edit.questions;

    App.FieldView = Backbone.View.extend({
      tagName: "li",
      //className: "list-group-item",
      model: null,
      template: null,

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

      endEdit: function(){
        this.$el.removeClass("editing");
        this.model.set({value: this.input.val()});
        var question = App.application.getQuestion(this.model.get("parentID"));
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
        var question = App.application.getQuestion(this.model.get("parentID"));
        question.get("fields").remove(this.model.toJSON());
        this.model.destroy();
        question.save();
      }

    });

    App.TableLayoutView = App.FieldView.extend({

      events: {
        "click .tableLayout.glyphicon-trash": "deleteField",
        "click .tableLayout.glyphicon-edit": "startEdit",
        "click .tableLayout.glyphicon-check": "endEdit"
      },

      initialize: function(){
        App.FieldView.prototype.initialize.apply(this);
        this.fields = new App.FieldsList();
        this.fields.fetch();
      },

      startEdit: function(){
        this.$el.addClass("editing");
      },

      endEdit: function(){
        this.$el.removeClass("editing");
        //var question = App.application.getQuestion(this.model.get("parentID"));
        //question.save();
      },

      drop: function(evt, ui){
        var elem = $(ui.draggable);
        var data = elem.data("backbone-view");
        var new_data = data;
        var rowIndex = evt.target.parentNode.rowIndex;
        var columnIndex = evt.target.cellIndex;
        new_data.set("rowPosition", rowIndex);
        new_data.set("columnPosition", columnIndex);
        new_data.set("parentID", this.model.get("uuid"));
        if (!new_data.get("uuid")){
          new_data.set("uuid", new Date().getTime());
        }
        this.fields.create(new_data.toJSON());
        this.fields.fetch();
        //this.endEdit();
        this.render();
      },

      render: function(){
        var modelTemplate = this.model.template(this.model.attributes);
        this.$el.html(this.template(this.model.attributes));
        $(".view-mode .contents", this.$el).html($(modelTemplate).filter(".view-mode").html());
        $(".edit-mode .contents", this.$el).html($(modelTemplate).filter(".edit-mode").html());

        this.$el.find("td").droppable({
          hoverClass: "tableLayout-droppable",
          accept: "#fields-listing .ui-draggable",
          greedy: true,
          tolerance: "pointer",
          drop: _.bind(this.drop, this)
        });

        var view_tables = this.$el.find("table");
        var fields = this.fields.where({"parentID": this.model.get("uuid")});
        _.each(fields, function(field){
          var fieldType = field.get("type");
          var newmodel = new App.FieldMapping[fieldType].constructor(field.toJSON());
          var viewer = App.FieldMapping[fieldType].viewer;

          var rowIndex = newmodel.get("rowPosition");
          var columnIndex = newmodel.get("columnPosition");

          _.each(view_tables, function(table){
            var view_table = table;
            var view = new viewer({model: newmodel});
            $(view_table.rows[rowIndex].cells[columnIndex]).append(view.render().el);
          }, this);

        }, this);
        return this;
      }

    });

  });
})(jQuery);
