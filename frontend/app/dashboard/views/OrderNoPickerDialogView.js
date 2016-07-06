// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/viewport',
  'app/core/View',
  'app/dashboard/templates/orderNoPickerDialog'
], function(
  _,
  $,
  t,
  viewport,
  View,
  template
) {
  'use strict';

  return View.extend({

    dialogClassName: 'dashboard-orderNoPickerDialog',

    template: template,

    localTopics: {
      'programmer.barcodeScanned': function(message)
      {
        if (message.remote === true && message.value.length === 1)
        {
          this.$('.list-group-item[data-hotkey="' + message.value.toUpperCase() + '"]').click();
        }
      }
    },

    events: {
      'click .list-group-item': function(e)
      {
        e.preventDefault();

        this.trigger('orderNoPicked', e.currentTarget.dataset.id);
      }
    },

    initialize: function()
    {
      this.$els = null;
      this.onResize = _.debounce(this.resize.bind(this), 33);
      this.onKeyPress = this.onKeyPress.bind(this);

      $(window)
        .on('resize.orderNoPickerView', this.onResize)
        .on('keypress.orderNoPickerView', this.onKeyPress);
    },

    destroy: function()
    {
      $(window).off('.orderNoPickerView');

      this.$els = null;
    },

    serialize: function()
    {
      var selectedOrderNo = this.model.get('selectedOrderNo');

      return {
        idPrefix: this.idPrefix,
        items: (this.model.get('remoteData') || []).map(function(orderData, i)
        {
          return {
            orderNo: orderData._id,
            name: orderData.name,
            nc12: orderData.nc12[0],
            quantityTodo: orderData.quantityTodo,
            quantityDone: orderData.quantityDone,
            hotkey: (i + 1).toString(36).toUpperCase(),
            className: orderData._id === selectedOrderNo
              ? 'info'
              : orderData.status === -1
                ? 'danger'
                : orderData.status === 0
                  ? 'success'
                  : 'warning'
          };
        })
      };
    },

    afterRender: function()
    {
      this.$els = {
        header: this.$el.closest('.modal-content').find('.modal-header'),
        list: this.$id('list')
      };
    },

    resize: function()
    {
      if (this.$els)
      {
        var height = window.innerHeight - this.$els.header.outerHeight();

        this.$els.list.css('max-height', height + 'px');
      }
    },

    onDialogShown: function()
    {
      this.resize();

      var $selectedItem = this.$('.list-group-item-info');

      if ($selectedItem.length)
      {
        $selectedItem.focus();
      }
      else
      {
        this.$('.list-group-item').first().focus();
      }
    },

    onKeyPress: function(e)
    {
      var key = String.fromCharCode(e.keyCode);

      if (/^[a-zA-Z0-9]$/.test(key))
      {
        this.$('.list-group-item[data-hotkey="' + key.toUpperCase() + '"]').click();
      }
    }

  });
});
