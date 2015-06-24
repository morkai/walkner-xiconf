// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/viewport',
  'app/core/View',
  'app/dashboard/templates/programPicker'
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

    dialogClassName: 'dashboard-programPickerDialog',

    template: template,

    events: {
      'click .list-group-item': function(e)
      {
        this.socket.emit('programmer.setProgram', e.currentTarget.dataset.id, function(err)
        {
          if (err)
          {
            viewport.msg.show({
              type: 'error',
              time: 2500,
              text: t('dashboard', 'program:picker:failure')
            });
          }
          else
          {
            viewport.msg.show({
              type: 'success',
              time: 1500,
              text: t('dashboard', 'program:picker:success')
            });
          }
        });

        return false;
      },
      'focus #-filter': 'toggleAlt',
      'blur #-filter': 'toggleAlt',
      'input #-filter': function(e)
      {
        this.toggleAlt();

        var filter = e.target.value.trim().toLowerCase();
        var hotkey = 1;

        _.forEach(this.$els.list[0].children, function(programEl)
        {
          var $program = $(programEl);
          var display = filter === '' || $program.text().toLowerCase().indexOf(filter) !== -1 ? 'block' : 'none';

          $program.find('kbd').remove();
          $program.css('display', display);

          if (display === 'block' && hotkey < 10)
          {
            $program.prepend('<kbd data-hotkey="' + hotkey + '"><span>ALT+</span>' + hotkey + '</kbd>');

            ++hotkey;
          }
        });
      }
    },

    initialize: function()
    {
      this.$els = null;
      this.onResize = _.debounce(this.resize.bind(this), 33);

      this.listenTo(this.collection, 'reset', this.render);

      $(window).on('resize.programPickerView', this.onResize);
      $(window).on('keydown.programPickerView', this.onKeyDown.bind(this));

      this.promised(this.collection.fetch({reset: true}));
    },

    destroy: function()
    {
      $(window).off('.programPickerView');

      this.$els = null;
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        programs: this.collection.sortNaturally().filterByProdLine(this.options.prodLineId)
      };
    },

    afterRender: function()
    {
      var $dialog = this.$el.closest('.modal-dialog');

      this.$els = {
        dialog: $dialog,
        header: $dialog.find('.modal-content').find('.modal-header'),
        filter: this.$id('filter'),
        list: this.$id('list')
      };

      this.$els.filter.focus();
      this.resize();
    },

    resize: function()
    {
      if (this.$els)
      {
        var marginTop = parseInt(this.$els.dialog.css('margin-top'), 10);
        var height = window.innerHeight
          - this.$els.header.outerHeight()
          - this.$els.filter.outerHeight()
          - marginTop * 2;

        this.$els.list.css('max-height', height + 'px');
      }
    },

    toggleAlt: function()
    {
      this.$el.toggleClass('is-alt', document.activeElement === this.$els.filter[0] && this.$els.filter.val() !== '');
    },

    onDialogShown: function()
    {
      this.resize();

      this.$id('filter').focus();
    },

    onKeyDown: function(e)
    {
      if (e.keyCode < 49 || e.keyCode > 57)
      {
        return;
      }

      if (e.altKey || !this.$el.hasClass('is-alt'))
      {
        this.$('kbd[data-hotkey="' + String.fromCharCode(e.keyCode) + '"]').closest('a').click();

        return false;
      }
    }

  });
});
