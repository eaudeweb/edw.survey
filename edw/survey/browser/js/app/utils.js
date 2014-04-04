/*global Backbone */


(function($){
  $(document).ready(function(){

    Backbone.emulateHTTP = true;
    tinyMCE.baseURL="/++resource++edw.survey.static/js/lib/tinymce/js/tinymce";
    tinymce.suffix = ".min";


    var App = null;

    if(window.edw.survey.view !== undefined){
      App = window.edw.survey.view;
    }
    else if(window.edw.survey.edit.questions !== undefined) {
      App = window.edw.survey.edit.questions;
    }

    App.Templates.compiled = {};
    App.Templates.load = function(data){
      var html = $(data);
      _.each(this.sources, function(value, key, list){
        this.compiled[value.name] = _.template(html.filter(value.target).html());
      }, this);
    };
  });
})(jQuery);
