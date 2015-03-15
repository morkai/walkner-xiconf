// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'jquery',
  'app/i18n',
  'app/time',
  'app/core/View',
  'app/history/util/decorateLogEntry',
  'app/dashboard/templates/log',
  'app/dashboard/templates/logEntry'
], function(
  $,
  t,
  time,
  View,
  decorateLogEntry,
  logTemplate,
  logEntryTemplate
) {
  'use strict';

  return View.extend({

    template: logTemplate,

    localTopics: {
      'hotkeys.focusLog': function()
      {
        this.$el.focus();
      }
    },

    initialize: function()
    {
      this.$countdown = null;

      this.listenTo(this.model, 'change:log', this.renderLogEntries);
      this.listenTo(this.model, 'change:countdown', this.renderCountdown);
      this.listenTo(this.model, 'push:log', this.renderLogEntry);
    },

    destroy: function()
    {
      this.cancelAnimations();

      this.$countdown = null;
    },

    beforeRender: function()
    {
      this.$countdown = null;
    },

    afterRender: function()
    {
      this.renderLogEntries();

      if (this.model.get('countdown') === -1)
      {
        this.el.scrollTop = this.el.scrollHeight;
      }

      this.renderCountdown();
    },

    resize: function(height)
    {
      this.el.style.height = height + 'px';
    },

    renderLogEntries: function()
    {
      this.$el.find('p').remove();

      var logEntries = this.model.get('log');

      if (Array.isArray(logEntries) && logEntries.length)
      {
        logEntries.forEach(this.renderLogEntry, this);
      }
    },

    renderLogEntry: function(logEntry)
    {
      this.$el.append(logEntryTemplate(decorateLogEntry(logEntry)));

      this.el.scrollTop = this.el.scrollHeight;
    },

    renderCountdown: function()
    {
      if (this.model.get('countdown') >= 0)
      {
        this.showCountdown();
      }
      else
      {
        this.hideCountdown();
      }
    },

    showCountdown: function()
    {
      this.el.scrollTop = 0;

      if (this.$countdown === null)
      {
        this.$countdown = $('<div class="dashboard-log-countdown"></div>')
          .hide()
          .text(this.model.get('countdown'))
          .appendTo(this.el)
          .fadeIn('fast');
      }
      else
      {
        this.$countdown.text(this.model.get('countdown'));
      }
    },

    hideCountdown: function()
    {
      var $countdown = this.$countdown;

      if ($countdown === null)
      {
        return;
      }

      $countdown.fadeOut('fast', function() { $countdown.remove(); });

      this.$countdown = null;
      this.el.scrollTop = this.el.scrollHeight;
    }

  });
});
