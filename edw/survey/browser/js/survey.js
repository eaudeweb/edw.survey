/*global Backbone document console jQuery*/


(function($){
  $(document).ready(function(){


    if(window.edw === undefined) { window.edw = { version: "1.0" }; }
    var edw = window.edw;
    if(edw.survey === undefined) { edw.survey = {}; }
    if(edw.survey.view === undefined) { edw.survey.view = {}; }


    edw.survey.view = {
      Templates: {
        sources: [
        ]
      }
    };

    var App = edw.survey.view;

    App.QuestionList = Backbone.Collection.extend({
      url: "questions",
      initialize: function(){
        this.model = App.Question;
      }
    });


    App.FieldView = Backbone.View.extend({
      tagName: "li",

      render: function(){
        this.$el.html(this.model.renderTemplate());
        return this;
      }

    });

    App.CheckboxFieldView = App.FieldView.extend({});

    App.RichTextBlockFieldView = App.FieldView.extend({});

    App.TableLayoutView = App.FieldView.extend({

      initialize: function(){
        App.FieldView.prototype.initialize.apply(this);
        this.fields = App.application.fields;
      },

      render: function(){
        this.$el.html(this.model.renderTemplate());

        var view_table = this.$el.find("table").get(0);
        var fields = this.fields.where({"parentID": this.model.get("uuid")});
        _.each(fields, function(field){
          var fieldType = field.get("type");
          var viewer = App.FieldMapping[fieldType].viewer;
          var view = new viewer({model: field});

          var rowIndex = field.get("rowPosition");
          var columnIndex = field.get("columnPosition");

          $(view_table.rows[rowIndex].cells[columnIndex]).append(view.render().el);

        }, this);
        return this;
      }

    });


    App.QuestionView = Backbone.View.extend({
      tagName: "li",
      model: null,

      initialize: function(){
        this.listenTo(App.application.fields, "add", this.render);
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
        var rendered_view = view.render();
        var rendered_el = $(rendered_view.el);
        rendered_el.addClass("survey-field ");
        rendered_el.data("field-data", field.toJSON());
        $(".question-body", this.$el).append(rendered_el);
      }

    });

    App.QuestionsView = Backbone.View.extend({
      el: $("#displayarea ul#questions-listing"),
      collection: null,
      initialize: function(){
        App.QuestionList.model = App.Question;
        this.collection = new App.QuestionList();
        this.collection.fetch();
      },

      render: function(){
        if (_.isEmpty(this.collection)) {
          return;
        }
        this.collection.each(function(question){
          this.renderOne(question);
        }, this);
      },
      renderOne: function(question){
        var view = new App.QuestionView({model: question});
        this.$el.append(view.render().el);
      }
    });


    App.AppView = Backbone.View.extend({

      el: $("#application"),

      initialize: function(){
        this.sidebar = $("#sidebar");
        this.workshop = $("#workshop");

        this.questionsView = new App.QuestionsView();
        this.fields = new App.FieldsList();
        this.fields.fetch();

        this.listenTo(this.questionsView.collection, 'add', this.displayQuestion);
      },

      render: function(){
        this.questionsView.render();
      },

      getQuestion: function(uuid){
        return this.questionsView.collection.findWhere({ uuid: uuid });
      },

      displayQuestion: function(question){
        this.questionsView.renderOne(question);
      },

      getAnswer: function(){
        var answer = {};
        var formfields = $(".survey-field");
        _.each(formfields, function(elem){
          var $elem = $(elem);
          var data = $elem.data("field-data");
          var value = App.FieldMapping[data.type].valueGetter($elem);
          answer[data.uuid] = {
            field: data,
            answer: value
          };
        }, this);
        return answer;
      }
    });

    $.ajax({
      url: "++resource++edw.survey.static/js/templates/survey.tmpl",
      success: function(response){
        App.Templates.load(response);
        App.FieldMapping.init();
        App.application = new App.AppView();
        App.application.render();
        $("form[action='answer']").on("submit", function(evt){
          evt.preventDefault();
          var answer = App.application.getAnswer();
          $.ajax({
            url: "answer",
            cache: false,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(answer),
            success: function(response){
              window.location.reload();
            }
          });
          return false;
        });
      }
    });
  });
})(jQuery);
