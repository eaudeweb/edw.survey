/*global Backbone document jQuery*/


(function($){
  $(document).ready(function(){


    if(window.edw === undefined) { window.edw = { version: "1.0" }; }
    var edw = window.edw;
    if(edw.survey === undefined) { edw.survey = {}; }
    if(edw.survey.edit === undefined) { edw.survey.edit = {}; }


    edw.survey.edit.logic = {
      Templates: {
        sources: [
          {"name": "splitterTemplate", "target": "#splitter-template"}
        ]
      }
    };

    var App = edw.survey.edit.logic;

    var Controller = Backbone.View.extend({
    });

    App.Controller = new Controller();

    App.QuestionList = Backbone.Collection.extend({
      url: "questions",
      initialize: function(){
        this.model = App.Question;
      }
    });

    App.QuestionView = Backbone.View.extend({
      tagName: "li",
      render: function(){
        this.$el.html(this.model.template({data: this.model.attributes}));
        return this;
      }
    });

    App.QuestionsView = Backbone.View.extend({
      el: $("#sidebar ul#questions-listing"),
      initialize: function(){
        this.collection = App.application.questions;
        this.$el.sortable({
          connectWith: ".sortable-listing",
          tolerance: "pointer",
          dropOnEmpty: true,
          stop: function(event, ui){
            if (!$(ui.item[0]).hasClass("splitter")){
              return;
            }
            if (!ui.item.parent().hasClass("added-questions")){
              $(this).sortable("cancel");
              return;
            }
            var idx = $(".added-questions").children().index($(ui.item[0])) - 1;
            var elm = $(ui.item[0]).clone(true);
            if (idx === -1) {
              idx = 0;
            }

            elm.find(".splitter-questions").sortable({connectWith: ".sortable-listing"});
            $(".added-questions").children(":eq(" + idx + ")").after(elm);
            $(this).sortable("cancel");
          }
        });
        this.listenTo(App.Controller, "questions-add", this.renderOne);
      },

      render: function(){
        var splitter = new App.SplitterView();
        this.$el.append(splitter.render());
      },
      renderOne: function(question){
        var view = new App.QuestionView({model: question});
        this.$el.append(view.render().el);
      }
    });


    App.LogicView = Backbone.View.extend({
      el: $("#displayarea"),
      sortTarget: $(".added-questions"),
      initialize: function(){
        this.listenTo(App.Controller, "questions-reset", this.render);
        this.listenTo(App.Controller, "logic-rendered", function(){
          this.initSortable();
        });
      },
      initSortable: function(){
        this.sortTarget.sortable({
          connectWith: ".sortable-listing",
          tolerance: "pointer",
          stop: function(event, ui){
            if (!$(ui.item[0]).hasClass("splitter")){
              return;
            }
            if (ui.item.parent().hasClass("added-questions")){
              return;
            }
            ui.item.remove();
          }
        });
      },
      render: function(){
        App.Controller.trigger("logic-rendered");
      }
    });


    App.SplitterView = Backbone.View.extend({
      render: function(){
        return App.Templates.compiled.splitterTemplate();
      }
    });

    App.AppView = Backbone.View.extend({

      el: $("#application"),

      initialize: function(){
        App.QuestionList.model = App.Question;
        this.questions = new App.QuestionList();
        this.listenTo(this.questions, "reset", function(){
          App.Controller.trigger("questions-reset");
        });
        this.listenTo(this.questions, "add", function(question){
          App.Controller.trigger("questions-add", question);
        });
        this.questions.fetch();
      },
      render: function(){
        this.questionsView.render();
        this.logicView.render();
      }
    });

    $.ajax({
      url: "++resource++edw.survey.static/js/templates/logic.tmpl",
      success: function(response){
        App.Templates.load(response);
        App.application = new App.AppView();
        App.application.questionsView = new App.QuestionsView();
        App.application.logicView = new App.LogicView();
        App.application.render();
      }
    });
  });
})(jQuery);
