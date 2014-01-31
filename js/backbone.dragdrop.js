Backbone.DragDrop = {};
Backbone.DragDrop.DraggableView = Backbone.View.extend({
	initialize: function () {
		this.$el.attr("draggable", "true");
		this.$el.bind("dragstart", _.bind(this._dragStartEvent, this));
	},

	_dragStartEvent: function (e) {
		var data;
		if (e.originalEvent) e = e.originalEvent;
		e.dataTransfer.effectAllowed = "copy"; // default to copy
		data = this.dragStart(e.dataTransfer, e);

		window._backboneDragDropObject = null;
		if (data !== undefined) {
			window._backboneDragDropObject = data; // we cant bind an object directly because it has to be a string, json just won't do
		}
	},

	dragStart: function (dataTransfer, e) {} // override me, return data to be bound to drag
});

Backbone.DragDrop.DroppableView = Backbone.View.extend({
	initialize: function () {
		this.$el.bind("dragover", _.bind(this._dragOverEvent, this));
		this.$el.bind("dragenter", _.bind(this._dragEnterEvent, this));
		this.$el.bind("dragleave", _.bind(this._dragLeaveEvent, this));
		this.$el.bind("drop", _.bind(this._dropEvent, this));
		this._draghoverClassAdded = false;
	},

	_dragOverEvent: function (e) {
		if (e.originalEvent) e = e.originalEvent;
		var data = this._getCurrentDragData(e);

		if (this.dragOver(data, e.dataTransfer, e) !== false) {
			if (e.preventDefault) e.preventDefault();
			e.dataTransfer.dropEffect = 'copy'; // default
		}
	},

	_dragEnterEvent: function (e) {
		if (e.originalEvent) e = e.originalEvent;
		if (e.preventDefault) e.preventDefault();
	},

	_dragLeaveEvent: function (e) {
		if (e.originalEvent) e = e.originalEvent;
		var data = this._getCurrentDragData(e);
		this.dragLeave(data, e.dataTransfer, e);
	},

	_dropEvent: function (e) {
		if (e.originalEvent) e = e.originalEvent;
		var data = this._getCurrentDragData(e);

		if (e.preventDefault) e.preventDefault();
		if (e.stopPropagation) e.stopPropagation(); // stops the browser from redirecting

		if (this._draghoverClassAdded) this.$el.removeClass("draghover");

		this.drop(data, e.dataTransfer, e);
	},

	_getCurrentDragData: function (e) {
		var data = null;
		if (window._backboneDragDropObject) data = window._backboneDragDropObject;
		return data;
	},

	dragOver: function (data, dataTransfer, e) { // optionally override me and set dataTransfer.dropEffect, return false if the data is not droppable
		this.$el.addClass("draghover");
		this._draghoverClassAdded = true;
	},

	dragLeave: function (data, dataTransfer, e) { // optionally override me
		if (this._draghoverClassAdded) this.$el.removeClass("draghover");
	},

	drop: function (data, dataTransfer, e) {} // overide me!  if the draggable class returned some data on 'dragStart' it will be the first argument
});
