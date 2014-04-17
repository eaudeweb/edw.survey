/*global Backbone document jQuery*/


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
      url: "answer_questions",
      initialize: function(){
        this.model = App.Question;
      }
    });

    App.FieldView = Backbone.View.extend({
      tagName: "li",

      events: {
        "change": "announceKeypress",
        "keyup": "announceKeypress"
      },

      announceKeypress: function(){
        App.application.trigger("field-modified", this);
      },

      getValue: function(){
        var value = App.FieldMapping[this.model.get("type")].valueGetter(this.$el);
        return value;
      },

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
          var rendered_el = $(view.render().el);
          rendered_el.addClass("survey-field ");
          rendered_el.data("field-data", field.toJSON());

          $(view_table.rows[rowIndex].cells[columnIndex]).append(rendered_el);

        }, this);

        return this;

      }

    });


    App.QuestionView = Backbone.View.extend({
      tagName: "li",
      model: null,

      listenForFields: function(field){
        this.displayIf(field);
      },

      checkCondition: function(){
        var condition = this.model.get("logic_condition");
        if(condition){
          this.$el.hide();
          this.listenTo(App.application, "field-modified", this.listenForFields);
          var cond_target_val = condition.split("==");
          var cond_target = cond_target_val[0].split(" ");
          var cond_val = cond_target_val[1].split("\"")[1];
          var cond = cond_target[0];
          var question_field_name = cond_target[1].split(".");
          var question_id = question_field_name[0].slice(-1);
          var field_id = parseInt(question_field_name[1].slice(-1), 10);
          var name = question_field_name[2];

          var question = App.application.questions.findWhere({name: "Question " + question_id});
          var field = App.application.fields.where({
            parentID: question.get("uuid")
          })[field_id - 1];

          this.displayIf = function(field){
            var value = field.getValue();
            console.log(field.getValue());
            if(value == cond_val){
              this.$el.show();
            } else {
              this.$el.hide();
            }
          };
        }
      },

      render: function(){
        this.$el.data("backbone-view", this);
        this.$el.html(this.model.template({data: this.model.attributes}));
        var fields = App.application.fields.where({parentID: this.model.get("uuid")});
        _.each(fields, function(field){
          this.renderField(field);
        }, this);
        this.checkCondition();
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
        rendered_el.data("backbone-view", view);
        $(".question-body", this.$el).append(rendered_el);
        this.checkViewAs();
      },

      checkViewAs: function(){
        if(App.viewAs){
          $("#content .question .input-type-field").prop("disabled", true);
        }
      }
    });

    App.QuestionsView = Backbone.View.extend({
      el: $("#displayarea ul#questions-listing"),
      collection: null,

      render: function(){
        App.application.questions.each(function(question){
          this.renderOne(question);
        }, this);
      },
      renderOne: function(question){
        var view = new App.QuestionView({model: question});
        this.$el.append(view.render().el);
      }
    });

    App.viewAs = $.url().param("viewAs");

    App.AppView = Backbone.View.extend({

      el: $("#application"),

      initialize: function(){
        this.sidebar = $("#sidebar");
        this.workshop = $("#workshop");
      },

      render: function(){
        this.questionsView.render();
      },

      getQuestion: function(uuid){
        return this.questionsView.collection.findWhere({ uuid: uuid });
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
        App.application.fields = new App.AnswerFieldsList();
        App.application.questions = new App.QuestionList();
        $.when(
          App.application.fields.fetch(),
          App.application.questions.fetch()).then(
            _.bind(function(){
              App.application.questionsView = new App.QuestionsView();
              App.application.render();
            }, this)
          );
        if (App.viewAs){
          var form = $("#survey-answer-form");
          var listing = $("#questions-listing");
          form.parent().append(listing);
          form.remove();
          var info = $('<div class="alert alert-info"></div>');
          info.html('<strong>Attention!</strong> You are currently viewing the survey as it appears for <strong>' + App.viewAs + '</strong>.');
          $("#application").prepend(info);
        }
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
