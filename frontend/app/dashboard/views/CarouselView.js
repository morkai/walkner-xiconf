// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/core/View',
  'app/dashboard/templates/carousel',
  'jquery.flipster'
], function(
  View,
  carouselTemplate
) {
  'use strict';

  return View.extend({

    template: carouselTemplate,

    initialize: function()
    {
      this.$els = null;

      this.listenTo(this.model, 'change:result', this.onResultChange);
    },

    destroy: function()
    {
      this.$els = null;
    },

    afterRender: function()
    {
      this.$els = this.$el.find('li');

      this.$el.flipster({
        start: this.getCurrentItemIndex(),
        disableRotation: true
      });
    },

    resize: function(width, height)
    {
      var size = Math.min(width, height);

      this.$els.css({
        width: size,
        height: size
      });

      this.$el.flipster('center', size);
    },

    getCurrentItemIndex: function()
    {
      var currentItemId = this.model.getCarouselItemId();

      return this.$els
        .filter(function() { return this.dataset.itemId === currentItemId; })
        .first()
        .index();
    },

    onResultChange: function()
    {
      this.$el.flipster('jump', this.getCurrentItemIndex());
    }

  });
});
