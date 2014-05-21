// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
      var size = Math.min(width, height * 1.1);

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