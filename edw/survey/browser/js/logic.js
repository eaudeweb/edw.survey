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
          {"name": "splitter", "target": "#splitter-template"},
          {"name": "split", "target": "#split-template"}
        ]
      }
    };

    var App = edw.survey.edit.logic;

    var Controller = Backbone.View.extend({
    });

    App.Controller = new Controller();

    App.initSortable = function(element, view){
      element.sortable({
        connectWith: ".sortable-listing",
        tolerance: "pointer",
        dropOnEmpty: true,
        placeholder: "ui-state-highlight",
        stop: view.sortableStop
      }).disableSelection();
    };

    App.Question = Backbone.Model.extend({
      idAttribute: "uuid",
      defaults: function(){
        var def = {
          type: "question"
        };
        return def;
      },
      initialize: function(){
        this.template = App.Templates.compiled.question;
      }
    });

    App.Splitter = Backbone.Model.extend({
      idAttribute: "uuid",
      defaults: function(){
        var def = {
          type: "splitter"
        };
        return def;
      },
      initialize: function(){
        this.template = App.Templates.compiled.splitter;
      }
    });

    App.Split = Backbone.Model.extend({
      idAttribute: "uuid",
      defaults: function(){
        var def = {
          type: "split"
        };
        return def;
      },
      initialize: function(){
        this.template = App.Templates.compiled.split;
      }
    });

    App.SplitterList = Backbone.Collection.extend({
      url: "logic_splitters",
      initialize: function(){
        this.model = App.Splitter;
      }
    });

    App.SplitList = Backbone.Collection.extend({
      url: "logic_splits",
      initialize: function(){
        this.model = App.Split;
      }
    });

    App.QuestionList = Backbone.Collection.extend({
      url: "logic_questions",
      initialize: function(){
        this.model = App.Question;
      }
    });

    App.QuestionView = Backbone.View.extend({
      tagName: "li",
      className: "question-item",
      initialize: function(){
        this.$el.data("backbone-view", this);
      },
      render: function(){
        this.$el.html(this.model.template({data: this.model.attributes}));
        return this;
      }
    });

    App.QuestionsView = Backbone.View.extend({
      el: $("#sidebar ul#questions-listing"),
      initialize: function(){
        this.initSortable();
      },

      initSortable: function(){
        App.initSortable(this.$el, this);
      },

      sortableStop: function(event, ui){
        // don't sort in left-picker list
        if (ui.item.parent().is("#questions-listing")){
          $(this).sortable("cancel");
          return;
        }

        // don't move spliter, clone it
        var item_is_splitter = $(ui.item[0]).hasClass("splitter");
        var target_is_logic_view = ui.item.parent().hasClass("added-questions");

        if (item_is_splitter && target_is_logic_view){

          var idx = $(".added-questions").children().index(ui.item);

          App.application.splitters.add({
            uuid: App.genUUID(),
            logic_position: idx
          });

          var elm = ui.item.clone(true);

          App.initSortable(elm.find(".splitter-questions"), this);
          $(".added-questions").children(":eq(" + idx + ")").after(elm);
          $(this).sortable("cancel");
        }

      },

      render: function(){
        var splitter = new App.SplitterView();
        this.$el.append(splitter.render());
        App.application.questions.each(function(question){
          this.renderOne(question);
        }, this);
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
        App.initSortable(this.sortTarget, this);
      },
      sortableStop: function(event, ui){
        if (!$(ui.item[0]).hasClass("splitter")){
          return;
        }
        if (ui.item.parent().hasClass("added-questions")){
          return;
        }
        ui.item.remove();
      },
      render: function(){
        App.Controller.trigger("logic-rendered");
      }
    });


    App.SplitterView = Backbone.View.extend({
      tagName: "li",
      className: "splitter",

      events: {
        "click .add-split": "addSplit"
      },

      addSplit: function(){
        this.$el.find(".panel-body").append(this.$el.find(".new-split.hidden").clone().removeClass("hidden"));
      },

      render: function(){
        var elm = App.Templates.compiled.splitter({
          data: {time: new Date().getTime()}
        });
        this.$el.html(elm);
        return this.el;
      }
    });

    App.AppView = Backbone.View.extend({

      el: $("#application"),

      initialize: function(){
        App.QuestionList.model = App.Question;
        this.questions = new App.QuestionList();
        this.splitters = new App.SplitterList();
        this.splits = new App.SplitList();
      },
      render: function(){
        this.listenTo(this.splitters, "add remove", this.renderSubViews);
        this.listenTo(this.questions, "add remove", this.renderSubViews);
        this.listenTo(this.splits, "add remove", this.renderSubViews);
        this.renderSubViews();
      },
      renderSubViews: function(){
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

        $.when(
          App.application.questions.fetch(),
          App.application.splitters.fetch(),
          App.application.splits.fetch()).then(
            _.bind(function(){
              App.application.render();
            }, this)
          );
      }
    });
  });
})(jQuery);
