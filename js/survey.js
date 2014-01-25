(function($){
  $(document).ready(function(){

    var Templates = {
      sources: [
        {"name": "question", "target": "#question-template"},
        {"name": "labelField", "target": "#labelField-template"},
        {"name": "textField", "target": "#textField-template"}
      ],
      compiled: {},
      load: function(data){
        var html = $(data);
        _.each(this.sources, function(value, key, list){
          this.compiled[value.name] = _.template(html.filter(value.target).html());
        }, this);
      }
    };

    var TextField = Backbone.Model.extend({
      initialize: function(){
        this.template = Templates.compiled.textField;
      }
    });

    var LabelField = Backbone.Model.extend({
      initialize: function(){
        this.template = Templates.compiled.labelField;
      }
    });

    var FieldsList = Backbone.Collection.extend({
      localStorage: new Backbone.LocalStorage("survey-backbone")
    });

    var Question = Backbone.Model.extend({
      defaults: function(){
        this.title = "Question";
        this.fields = [];
      }
    });

    var QuestionList = Backbone.Collection.extend({
      model: Question,
      localStorage: new Backbone.LocalStorage("survey-backbone")
    });

    var Questions = new QuestionList();

    var FieldView = Backbone.View.extend({
      tagName: "li",
      render: function(){
        this.$el.html(this.model.template());
        return this;
      }
    });


    var FieldsView = Backbone.View.extend({
      el: $("#sidebar ul#fields-listing"),
      collection: null,
      initialize: function(){
        var Fields = new FieldsList();
        Fields.add([new TextField(), new LabelField()]);
        this.collection = Fields;
      },
      render: function(){
        this.collection.each(function(field){
          var view = new FieldView({model: field});
          this.$el.append(view.render().el);
        }, this);
      }
    });


    var AppView = Backbone.View.extend({

      el: $("#application"),

      sidebar: null,
      workshop: null,

      initialize: function(){
        this.sidebar = $("#sidebar");
        this.workshop = $("#workshop");
      },

      render: function(){
      }
    });

    $.ajax({
      url: "./templates/survey.tmpl",
      success: function(response){
        Templates.load(response);
        var application = new AppView();
        application.render();

        new FieldsView().render();
      }
    });
  });
})(jQuery);
