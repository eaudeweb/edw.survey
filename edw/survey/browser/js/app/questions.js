/*global Backbone */

(function($){

  $(document).ready(function(){

    var App = null;

    if(window.edw.survey.view !== undefined){
      App = window.edw.survey.view;
    }
    else if(window.edw.survey.edit.questions !== undefined) {
      App = window.edw.survey.edit.questions;
    }

    var templates = [
      {"name": "question", "target": "#question-template"}
    ];
    _.each(templates, function(val){
      App.Templates.sources.push(val);
    });

    App.FieldsList = Backbone.Collection.extend({
      url: "fields",
      model: App.Field,
      comparator: function( a, b ) {
       
            var cols = ['parentID', 'order', 'uuid'],
                dirs = ['desc'],
                cmp;
       
            // First column that does not have equal values
            cmp = _.find( cols, function( c ) { return a.attributes[c] != b.attributes[c]; });
       
            // undefined means they're all equal, so we're done.
            if ( !cmp ) return 0;
       
            // Otherwise, use that column to determine the order
            // match the column sequence to the methods for ascending/descending
            // default to ascending when not defined.
            if ( ( dirs[_.indexOf( cols, cmp )] || 'asc' ).toLowerCase() == 'asc' ) {
               console.log(a.attributes[cmp], b.attributes[cmp]);
               return a.attributes[cmp] > b.attributes[cmp] ? 1 : -1;
            } else {
               console.log(a.attributes[cmp], b.attributes[cmp]);
               return a.attributes[cmp] < b.attributes[cmp] ? 1 : -1;
            }
       
         },
    });

    App.AnswerFieldsList = App.FieldsList.extend({
      url: function(){
          var base = "answer_fields";
          if(App.viewAs){
            return base + "/" + App.viewAs;
          }
          return base;
      }
    });

    App.Question = Backbone.Model.extend({
      idAttribute: "uuid",
      initialize: function(){
        this.template = App.Templates.compiled.question;
      },
      defaults: function(){
        var def = {
          name:  "the first!"//,
        };
        return def;
      },
      genUUID: function(){
        this.set("uuid", new Date().getTime());
      }
    });

  });
})(jQuery);
