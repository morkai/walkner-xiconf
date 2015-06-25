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

  function matchName(name, words)
  {
    for (var i = 0; i < words.length; ++i)
    {
      if (name.indexOf(words[i]) === -1)
      {
        return false;
      }
    }

    return true;
  }

  return View.extend({

    dialogClassName: 'dashboard-programPickerDialog',

    template: template,

    events: {
      'click .list-group-item': function(e)
      {
        var programId = e.currentTarget.dataset.id;

        if (programId === this.options.currentProgramId)
        {
          this.closeDialog();

          return false;
        }

        this.socket.emit('programmer.setProgram', programId, function(err)
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
      'input #-filter': function(e)
      {
        if (this.timers.filter)
        {
          clearTimeout(this.timers.filter);
        }

        this.$els.spinner.addClass('fa-spin');

        this.timers.filter = setTimeout(this.filter, this.collection.length < 20 ? 0 : 300, e.target.value);
      }
    },

    initialize: function()
    {
      this.$els = null;
      this.onResize = _.debounce(this.resize.bind(this), 33);
      this.filter = this.filter.bind(this);

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
        programs: this.collection
      };
    },

    afterRender: function()
    {
      var $dialog = this.$el.closest('.modal-dialog');

      this.$els = {
        dialog: $dialog,
        header: $dialog.find('.modal-content').find('.modal-header'),
        filter: this.$id('filter'),
        spinner: this.$id('spinner'),
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

    filter: function(phrase)
    {
      if (this.timers.filter)
      {
        clearTimeout(this.timers.filter);
        this.timers.filter = null;
      }

      var words = phrase.trim().toLowerCase().split(' ');
      var empty = words.length === 1 && words[0] === '';
      var hotkey = 1;
      var programs = this.collection;

      _.forEach(this.$els.list[0].children, function(programEl)
      {
        var display = empty || matchName(programs.get(programEl.dataset.id).attributes.name$f, words)
          ? 'block'
          : 'none';

        if (programEl.firstElementChild.tagName === 'KBD')
        {
          programEl.removeChild(programEl.firstElementChild);
        }

        programEl.style.display = display;

        if (display === 'block' && hotkey < 10)
        {
          $(programEl).prepend('<kbd data-hotkey="' + hotkey + '">ALT+' + hotkey + '</kbd>');

          ++hotkey;
        }
      });

      this.$els.spinner.removeClass('fa-spin');
    },

    closeDialog: function() {},

    onDialogShown: function(viewport)
    {
      this.closeDialog = viewport.closeDialog.bind(viewport);

      this.resize();

      this.$id('filter').focus();
    },

    onKeyDown: function(e)
    {
      if (e.altKey && e.keyCode >= 49 && e.keyCode <= 57)
      {
        this.$('kbd[data-hotkey="' + String.fromCharCode(e.keyCode) + '"]').closest('a').click();

        return false;
      }
    }

  });
});
