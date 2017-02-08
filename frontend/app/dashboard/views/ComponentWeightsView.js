// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/user',
  'app/core/View',
  'app/dashboard/templates/componentWeights',
  'app/dashboard/templates/componentWeight'
], function(
  _,
  $,
  t,
  user,
  View,
  listTemplate,
  itemTemplate
) {
  'use strict';

  return View.extend({

    template: listTemplate,

    events: {
      'click [data-no]': function(e)
      {
        if (user.isLocal())
        {
          this.selectComponentWeight(parseInt(e.currentTarget.dataset.no, 10) - 1);
        }
      }
    },

    initialize: function()
    {
      this.listenTo(this.model, 'change:waitingForComponentWeight', this.render);

      $(window).on('keydown.' + this.idPrefix, this.onKeyDown.bind(this));
    },

    destroy: function()
    {
      $(window).off('.' + this.onKeyDown);
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        renderItem: itemTemplate,
        items: _.map(this.model.get('waitingForComponentWeight'), this.serializeItem.bind(this))
      };
    },

    serializeItem: function(componentWeight, index)
    {
      return {
        no: index + 1,
        description: componentWeight.description,
        nc12: componentWeight.nc12,
        weight: Math.round((componentWeight.weight * 100) / 100).toLocaleString()
      };
    },

    afterRender: function()
    {
      this.resize();
    },

    resize: function()
    {
      var $list = this.$id('list');
      var offsetTop = $list.offset().top;

      $list[0].style.maxHeight = (window.innerHeight - offsetTop - 14) + 'px';
    },

    selectComponentWeight: function(index)
    {
      this.socket.emit('programmer.selectComponentWeight', index);
    },

    onKeyDown: function(e)
    {
      if (e.keyCode < 49 || e.keyCode > 57 || !this.model.get('waitingForComponentWeight'))
      {
        return;
      }

      this.$('[data-no="' + (e.keyCode - 48) + '"]').click();
    }

  });
});
