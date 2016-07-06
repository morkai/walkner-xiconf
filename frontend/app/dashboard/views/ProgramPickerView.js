// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/viewport',
  'app/core/View',
  'app/dashboard/templates/programPickerItem',
  'app/dashboard/templates/programPicker'
], function(
  _,
  $,
  t,
  viewport,
  View,
  renderProgramPickerItem,
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
          this.timers.filter = null;
        }

        if (this.loading)
        {
          return;
        }

        this.$els.spinner.addClass('fa-spin');

        this.timers.filter = setTimeout(this.filter, this.collection.length < 20 ? 0 : 300, e.target.value, true);
      }
    },

    initialize: function()
    {
      this.visiblePrograms = [];
      this.lastPhrase = '';
      this.loading = false;
      this.$els = null;
      this.onResize = _.debounce(this.resize.bind(this), 33);
      this.filter = this.filter.bind(this);

      this.listenTo(this.collection, 'reset', this.render);
      this.listenTo(this.collection, 'request', this.onLoadingStarted);
      this.listenTo(this.collection, 'sync error', this.onLoadingStopped);

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
        loading: this.loading,
        programs: this.visiblePrograms
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

    renderVisiblePrograms: function()
    {
      var html = _.map(this.visiblePrograms, function(program, i)
      {
        return renderProgramPickerItem({
          i: i,
          program: program
        });
      });

      this.$els.list.html(html.join(''));
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

    filter: function(phrase, render)
    {
      if (this.timers.filter)
      {
        clearTimeout(this.timers.filter);
        this.timers.filter = null;
      }

      var lastPhrase = this.lastPhrase;
      var newPhrase = phrase.trim().toLowerCase();
      var words = phrase.split(' ');

      if (newPhrase.length === 0)
      {
        this.visiblePrograms = this.collection.models;
      }
      else if (lastPhrase.length > 0 && lastPhrase.length < newPhrase.length && newPhrase.indexOf(lastPhrase) === 0)
      {
        this.visiblePrograms = _.filter(this.visiblePrograms, filterByName);
      }
      else
      {
        this.visiblePrograms = _.filter(this.collection.models, filterByName);
      }

      this.lastPhrase = newPhrase;

      this.$els.spinner.removeClass('fa-spin');

      if (render !== false)
      {
        this.renderVisiblePrograms();
      }

      function filterByName(program)
      {
        return matchName(program.attributes.name$f, words);
      }
    },

    closeDialog: function() {},

    moveDown: function()
    {
      var activeEl = document.activeElement;
      var filterEl = this.$els.filter[0];

      if (activeEl === filterEl)
      {
        var firstProgramEl = this.$els.list[0].firstElementChild;

        if (firstProgramEl)
        {
          firstProgramEl.focus();
        }
      }
      else if (activeEl.classList.contains('list-group-item'))
      {
        if (activeEl.nextElementSibling)
        {
          activeEl.nextElementSibling.focus();
        }
        else
        {
          filterEl.focus();
        }
      }
      else
      {
        filterEl.focus();
      }
    },

    moveUp: function()
    {
      var activeEl = document.activeElement;
      var filterEl = this.$els.filter[0];

      if (activeEl === filterEl)
      {
        var lastProgramEl = this.$els.list[0].lastElementChild;

        if (lastProgramEl)
        {
          lastProgramEl.focus();
        }
      }
      else if (activeEl.classList.contains('list-group-item'))
      {
        if (activeEl.previousElementSibling)
        {
          activeEl.previousElementSibling.focus();
        }
        else
        {
          filterEl.focus();
        }
      }
      else
      {
        filterEl.focus();
      }
    },

    onDialogShown: function(viewport)
    {
      this.closeDialog = viewport.closeDialog.bind(viewport);

      this.resize();

      this.$id('filter').focus();
    },

    onKeyDown: function(e)
    {
      var keyCode = e.keyCode;

      if (e.altKey && keyCode >= 49 && keyCode <= 57)
      {
        this.$('kbd[data-hotkey="' + String.fromCharCode(e.keyCode) + '"]').closest('a').click();

        return false;
      }

      if (keyCode === 32 && document.activeElement.classList.contains('list-group-item'))
      {
        document.activeElement.click();

        return false;
      }

      if (keyCode === 70 && document.activeElement !== this.$els.filter[0])
      {
        this.$els.filter.focus();

        return false;
      }

      if (keyCode === 40)
      {
        this.moveDown();

        return false;
      }

      if (keyCode === 38)
      {
        this.moveUp();

        return false;
      }

      if (keyCode === 36 || keyCode === 37)
      {
        var firstProgramEl = this.$els.list[0].firstElementChild;

        if (firstProgramEl)
        {
          firstProgramEl.focus();
        }
        else
        {
          this.$els.filter.focus();
        }

        return false;
      }

      if (keyCode === 35 || keyCode === 39)
      {
        var lastProgramEl = this.$els.list[0].lastElementChild;

        if (lastProgramEl)
        {
          lastProgramEl.focus();
        }
        else
        {
          this.$els.filter.focus();
        }

        return false;
      }
    },

    onLoadingStarted: function()
    {
      this.loading = true;

      if (this.$els)
      {
        this.$els.spinner.addClass('fa-spin');
      }
    },

    onLoadingStopped: function()
    {
      this.loading = false;

      if (this.$els)
      {
        this.filter(this.$els.filter.val(), false);
      }
      else
      {
        this.visiblePrograms = this.collection.models;
      }

      this.renderVisiblePrograms();
    }

  });
});
