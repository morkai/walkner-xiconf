// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/viewport',
  'app/core/View',
  'app/dashboard/templates/nc12PickerDialog'
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

    dialogClassName: 'dashboard-nc12PickerDialog',

    template: template,

    localTopics: {
      'programmer.barcodeScanned': function(message)
      {
        if (message.remote === true && message.value.length === 1)
        {
          this.$('.list-group-item[data-hotkey="' + message.value.toUpperCase() + '"]').focus();
        }
      }
    },

    events: {
      'click .list-group-item': function(e)
      {
        e.preventDefault();

        this.selectItem(e.currentTarget);
      },
      'focus .list-group-item': function(e)
      {
        e.preventDefault();

        this.selectItem(e.currentTarget);
      }
    },

    initialize: function()
    {
      this.$els = null;
      this.onResize = _.debounce(this.resize.bind(this), 33);
      this.onKeyDown = this.onKeyDown.bind(this);

      $(window)
        .on('resize.nc12PickerView', this.onResize)
        .on('keydown.nc12PickerView', this.onKeyDown);
    },

    destroy: function()
    {
      $(window).off('.nc12PickerView');

      this.$els = null;
    },

    serialize: function()
    {
      var selectedRemoteData = this.model.getSelectedRemoteData();
      var programItems = (selectedRemoteData ? selectedRemoteData.items : []).filter(function(item)
      {
        return item.kind === 'program';
      });

      return {
        idPrefix: this.idPrefix,
        leader: this.model.get('remoteLeader') || '?',
        items: programItems.map(function(item, i)
        {
          return {
            name: item.name,
            nc12: item.nc12,
            quantityTodo: item.quantityTodo,
            quantityDone: item.quantityDone + item.extraQuantityDone,
            hotkey: (i + 1).toString(36).toUpperCase()
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

    selectItem: function(itemEl)
    {
      this.$('.active').removeClass('active');
      itemEl.classList.add('active');

      setTimeout(function($password) { $password.focus(); }, 1, this.$id('password'));
    },

    onDialogShown: function()
    {
      this.resize();
    },

    onKeyDown: function(e)
    {
      var key = String.fromCharCode(e.keyCode);

      if ((e.ctrlKey || e.altKey || e.target.tagName !== 'INPUT') && /^[a-zA-Z0-9]$/.test(key))
      {
        this.$('.list-group-item[data-hotkey="' + key.toUpperCase() + '"]').focus();

        return false;
      }

      var $password = this.$id('password');
      var $selectedItem = this.$('.active');

      if (e.keyCode === 13 && e.target === $password[0] && $selectedItem.length)
      {
        var nc12 = $selectedItem[0].dataset.id;
        var password = $password.val();

        this.trigger('nc12Picked', nc12, password);
      }
    }

  });
});
