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

      initialize: function(){
        this.initSortable();
      },

      initSortable: function(){
        App.initSortable(this.$el, this);
      },

      sortableStop: function(event, ui){
        // don't sort in left-picker list
        if (ui.item.parent().is("#questions-listing")){
          this.$el.sortable("cancel");
          return;
        }

        // don't move spliter, clone it
        var idx = ui.item.parent().children().index(ui.item);
        var item_is_splitter = ui.item.hasClass("splitter");
        var item_is_question = ui.item.hasClass("question-item");
        var target_is_logic_view = ui.item.parent().hasClass("added-questions");
        var target_is_split_view = ui.item.parent().hasClass("splitter-questions");

        var view = ui.item.data("backbone-view");
        var target_view = ui.item.parent().data("backbone-view");

        if (item_is_splitter && target_is_logic_view){
          App.application.splitters.add({
            uuid: App.genUUID(),
            logic_position: idx,
            logic_parent: "logic"
          });
        }

        if (item_is_question && target_is_split_view){
          var split_view = ui.item.parent().parent().data("backbone-view");
          view.model.set({
            logic_position: idx,
            logic_parent: split_view.model.get("uuid")
          });
        }

        if (item_is_question && target_is_logic_view){
          view.model.set({
            logic_position: idx,
            logic_parent: "logic"
          });
        }

        var previous = ui.item.prevAll();
        var after = ui.item.nextAll();

        for (var i = 0; i < after.length; i++){
          $(after[i]).data("backbone-view").model.set("logic_position", i + idx + 1);
        }

        for (var j = 0; j < previous.length; j++){
          $(previous[j]).data("backbone-view").model.set("logic_position", (idx - (j + 1)));
        }

        this.$el.sortable("cancel");
        App.application.renderSubViews();
      },

      render: function(){
        this.$el.html("");
        this.$el.data("backbone-view", this);
        var splitterView = new App.SplitterView();
        this.$el.append(splitterView.render().el);
        App.application.questions.each(function(question){
          if (!question.get("logic_parent")){
            var view = new App.QuestionView({model: question});
            this.$el.append(view.render().el);
          }
        }, this);
      }
    });

    App.LogicView = Backbone.View.extend({
      el: $("#logic-listing"),
      initialize: function(){
        //this.listenTo(App.application.splitters, "add remove", this.update);
      },
      initSortable: function(){
        App.initSortable(this.$el, this);
      },
      sortableStop: function(event, ui){
        var idx = ui.item.parent().children().index(ui.item);
        var item_is_splitter = ui.item.hasClass("splitter");
        var item_is_question = ui.item.hasClass("question-item");
        var target_is_questions_listing = ui.item.parent().is("#questions-listing");
        var target_is_logic_view = ui.item.parent().hasClass("added-questions");
        var target_is_split_view = ui.item.parent().hasClass("splitter-questions");

        var view = ui.item.data("backbone-view");
        var target_view = ui.item.parent().data("backbone-view");

        if (item_is_splitter && target_is_questions_listing){
          ui.item.remove();
          App.application.splitters.remove(view.model);
          view.remove();
        }
        if (item_is_question && target_is_questions_listing){
          view.model.unset("logic_position");
          view.model.unset("logic_parent");
        }
        if (item_is_question && target_is_split_view){
          var split_view = ui.item.parent().parent().data("backbone-view");
          view.model.set({
            logic_position: idx,
            logic_parent: split_view.model.get("uuid")
          });
        }

        if (target_is_logic_view || target_is_split_view){
          var previous = ui.item.prevAll();
          var after = ui.item.nextAll();

          for (var i = 0; i < after.length; i++){
            $(after[i]).data("backbone-view").model.set("logic_position", i + idx + 1);
          }

          for (var j = 0; j < previous.length; j++){
            $(previous[j]).data("backbone-view").model.set("logic_position", (idx - (j + 1)));
          }
        }

        this.$el.sortable("cancel");
        App.application.renderSubViews();
      },
      render: function(){
        this.$el.html("");
        this.$el.data("backbone-view", this);
        this.initSortable();


        var to_display = [];

        var questions = App.application.questions.where({
          logic_parent: "logic"
        });

        var splitters = App.application.splitters.where({
          logic_parent: "logic"
        });

        _.each(questions, function(question){
          to_display.push(question);
        });

        _.each(splitters, function(splitter){
          to_display.push(splitter);
        });

        var sorted_to_display = _.sortBy(to_display, function(model){
          return model.get("logic_position");
        });

        _.each(sorted_to_display, function(model){
          var view = new App.ModelMapping[model.get("type")]({model: model});
          this.$el.append(view.render().el);
        }, this);
      }
    });


    App.SplitterView = Backbone.View.extend({
      tagName: "li",
      className: "splitter",

      initialize: function(){
        this.listenTo(App.application.splits, "add", this.render);
      },

      events: {
        "click .add-split": "addSplit"
      },

      addSplit: function(){
        App.application.splits.add({
          uuid: App.genUUID(),
          logic_parent: this.model.get("uuid")
        });
      },

      render: function(){
        this.$el.data("backbone-view", this);
        var elm = App.Templates.compiled.splitter();
        this.$el.html(elm);

        if(!this.model){
          return this;
        }

        var my_splits = App.application.splits.where({
          logic_parent: this.model.get("uuid")
        });

        _.each(my_splits, function(split){
          var view = new App.ModelMapping[split.get("type")]({model: split});
          this.$el.find(".panel-body").append(view.render().el);
        }, this);
        return this;
      }
    });

    App.SplitView = Backbone.View.extend({
      tagName: "div",
      className: "split",

      sortableStop: function(){
      },

      initSortable: function(){
        var sortableList = this.$el.find(".sortable-listing");
        App.initSortable(sortableList, this);
      },

      render: function(){
        this.$el.html(App.Templates.compiled.split());
        this.$el.data("backbone-view", this);
        this.initSortable();

        console.log("RERENDER!!!");

        var questions = App.application.questions.where({
          logic_parent: this.model.get("uuid")
        });

        _.each(questions, function(model){
          var view = new App.ModelMapping[model.get("type")]({model: model});
          this.$el.find(".splitter-questions").append(view.render().el);
        }, this);
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
        //this.listenTo(this.splitters, "add remove", this.renderSubViews);
        //this.listenTo(this.questions, "add remove", this.renderSubViews);
        //this.listenTo(this.splits, "add remove", this.renderSubViews);
        this.renderSubViews();
      },
      renderSubViews: function(){
        this.questionsView.render();
        this.logicView.render();
      }
    });

  App.ModelMapping = {
    splitter: App.SplitterView,
    question: App.QuestionView,
    split: App.SplitView
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
