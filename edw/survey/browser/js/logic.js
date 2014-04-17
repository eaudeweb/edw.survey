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

    App.initSortable = function(element, view){
      element.sortable({
        connectWith: ".sortable-listing",
        tolerance: "pointer",
        dropOnEmpty: true,
        placeholder: "ui-state-highlight",
        stop: _.bind(view.sortableStop, view)
      }).disableSelection();
      element.on("sortupdate", function(event, ui){
        App.application.trigger("sortupdate", element, event, ui);
      });
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
      render: function(){
        this.$el.data("backbone-view", this);
        this.$el.html(this.model.template({data: this.model.attributes}));
        return this;
      }
    });

    App.QuestionsView = Backbone.View.extend({
      el: $("#sidebar ul#questions-listing"),

      subviews: [],

      initialize: function(){
        this.initSortable();
        this.subviews.push(new App.SplitterView());
        App.application.questions.each(function(question){
          var view = new App.QuestionView({model: question});
          this.subviews.push(view);
        }, this);
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
        var idx = $(".added-questions").children().index(ui.item);
        var item_is_splitter = ui.item.hasClass("splitter");
        var item_is_question = ui.item.hasClass("question-item");
        var target_is_logic_view = ui.item.parent().hasClass("added-questions");

        if (item_is_splitter && target_is_logic_view){
          App.application.splitters.add({
            uuid: App.genUUID()
          });
        }

        if (item_is_question && target_is_logic_view){
          var view = ui.item.data("backbone-view");
          var target_view = ui.item.parent().data("backbone-view");
          var popped_view = App.popViewFromArray(view, this.subviews);
          target_view.subviews.push(popped_view);
        }
      },

      render: function(){
        this.$el.html("");
        this.$el.data("backbone-view", this);
        _.each(this.subviews, function(subview){
          this.$el.append(subview.render().el);
        }, this);
      }
    });

    App.LogicView = Backbone.View.extend({
      el: $("#logic-listing"),
      subviews: [],
      initialize: function(){
        this.listenTo(App.application.splitters, "add remove", this.update);
      },
      initSortable: function(){
        App.initSortable(this.$el, this);
      },
      sortableStop: function(event, ui){
        var view = ui.item.data("backbone-view");
        var target_view = ui.item.parent().data("backbone-view");
        var target_is_questions_list = ui.item.parent().is("#questions-listing");
        var item_is_splitter = ui.item.hasClass("splitter");
        var item_is_question = ui.item.hasClass("question-item");
        if (item_is_splitter){
          ui.item.remove();
          App.popViewFromArray(view, this.subviews);
          App.application.splitters.remove(view.model);
          view.remove();
        }
        if (item_is_question){
          view.model.unset("logic_position");
          var popped_view = App.popViewFromArray(view, this.subviews);
          target_view.subviews.push(popped_view);
        }
      },
      render: function(){
        this.$el.html("");
        this.$el.data("backbone-view", this);
        this.initSortable();
        _.each(this.subviews, function(subview){
          this.$el.append(subview.render().el);
        }, this);
      },
      update: function(model){
        var view = new App.ModelMapping[model.get("type")]({model: model});
        this.subviews.push(view);
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
        this.$el.data("backbone-view", this);
        var elm = App.Templates.compiled.splitter({
          data: {time: new Date().getTime()}
        });
        this.$el.html(elm);
        return this;
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

  App.ModelMapping = {
    splitter: App.SplitterView
  };


    $.ajax({
      url: "++resource++edw.survey.static/js/templates/logic.tmpl",
      success: function(response){
        App.Templates.load(response);
        App.application = new App.AppView();

        $.when(
          App.application.questions.fetch(),
          App.application.splitters.fetch(),
          App.application.splits.fetch()).then(
            _.bind(function(){
              App.application.questionsView = new App.QuestionsView();
              App.application.logicView = new App.LogicView();
              App.application.render();
            }, this)
          );
      }
    });
  });
})(jQuery);
