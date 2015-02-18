// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/user',
  'app/core/View',
  'app/data/currentState',
  'app/data/settings',
  'app/history/HistoryEntry',
  'app/history/HistoryEntryCollection',
  '../views/InputView',
  '../views/LogView',
  '../views/HistoryView',
  '../views/CarouselView',
  '../views/ProgramView',
  'app/dashboard/templates/page'
], function(
  _,
  $,
  t,
  user,
  View,
  currentState,
  settings,
  HistoryEntry,
  HistoryEntryCollection,
  InputView,
  LogView,
  HistoryView,
  CarouselView,
  ProgramView,
  pageTemplate
) {
  'use strict';

  return View.extend({

    layoutName: 'page',

    pageId: 'dashboard',

    template: pageTemplate,

    localTopics: {
      'viewport.dialog.shown': function()
      {
        clearTimeout(this.timers.blur);
        this.timers.blur = null;
      }
    },

    events: {
      'focus .form-control, .btn, a': 'scheduleBlur',
      'keydown': 'scheduleBlur'
    },

    initialize: function()
    {
      this.onWindowResize = _.debounce(this.resize.bind(this), 125);
      this.toggleFocusInfo = _.debounce(this.toggleFocusInfo.bind(this), 1);
      this.blur = this.blur.bind(this);
      this.$els = {
        navbar: null,
        focus: null,
        license: null,
        body: $(window.document.body),
        window: $(window),
        hotkeys: null
      };

      this.defineViews();

      this.insertView('.dashboard-left', this.inputView);
      this.insertView('.dashboard-left', this.logView);
      this.insertView('.dashboard-right', this.historyView);
      this.insertView('.dashboard-right', this.carouselView);
      this.insertView('.dashboard-right', this.programView);

      this.$els.window.on('wheel.dashboard', this.onWindowWheel);
      this.$els.window.on('resize.dashboard', this.onWindowResize);

      if (user.isLocal())
      {
        this.$els.window
          .on('focus.dashboard', this.toggleFocusInfo)
          .on('blur.dashboard', this.toggleFocusInfo);
      }

      this.listenTo(settings, 'change:licenseInfo', this.toggleLicenseInfo);
      this.listenTo(settings, 'change:testingEnabled', this.toggleTestingEnabled);
      this.listenTo(settings, 'change:hotkeys', this.updateHotkeys);
      this.listenTo(currentState, 'change:mode', this.toggleMode);
    },

    destroy: function()
    {
      this.$els.body.css('overflow', 'auto');
      this.$els.window.off('.dashboard');

      this.$els = null;
    },

    defineViews: function()
    {
      this.inputView = new InputView({model: currentState});
      this.logView = new LogView({model: currentState});
      this.historyView = new HistoryView({collection: new HistoryEntryCollection()});
      this.carouselView = new CarouselView({model: currentState});
      this.programView = new ProgramView({model: currentState});
    },

    beforeRender: function()
    {
      this.$els.body.css('overflow', 'hidden');

      clearInterval(this.timers.license);

      this.$els.hotkeys = null;
    },

    afterRender: function()
    {
      this.$els.navbar = $('.navbar');
      this.$els.license = this.$('.dashboard-license');

      if (user.isLocal())
      {
        this.$els.focus = $('<span class="btn active dashboard-focus"></span>').appendTo(this.el);
        this.toggleFocusInfo();
      }

      this.toggleMode();
      this.toggleLicenseInfo();
      this.toggleTestingEnabled();
      this.animateLicenseInfo();
      this.updateHotkeys();

      this.timers.license = setInterval(this.animateLicenseInfo.bind(this), 10000);
      this.timers.resize = setTimeout(this.resize.bind(this), 1);
    },

    scheduleBlur: function()
    {
      if (this.timers.blur)
      {
        clearTimeout(this.timers.blur);
      }

      this.timers.blur = setTimeout(this.blur, 5000);
    },

    resize: function()
    {
      var height = this.$els.window[0].innerHeight - this.inputView.$el.outerHeight(true) - 47;
      var width = this.historyView.$el.outerWidth(true);

      if (this.$els.navbar.length)
      {
        height -= this.$els.navbar.outerHeight(true);
      }

      this.logView.resize(height);
      this.carouselView.resize(width, height);
      this.programView.resize(width, height);
    },

    blur: function()
    {
      this.logView.$el.focus().blur();

      clearTimeout(this.timers.blur);
      this.timers.blur = null;
    },

    toggleFocusInfo: function()
    {
      if (!this.$els)
      {
        return;
      }

      this.$els.focus
        .removeClass('btn-info btn-danger')
        .addClass(document.hasFocus() ? 'btn-info' : 'btn-danger')
        .text(t('dashboard', 'focus:' + document.hasFocus()));
    },

    toggleLicenseInfo: function()
    {
      var licenseInfo = settings.get('licenseInfo');

      this.$els.license.toggle(!licenseInfo || !!licenseInfo.error);
    },

    toggleTestingEnabled: function()
    {
      this.$el.toggleClass('is-testing-enabled', !!settings.get('testingEnabled'));
    },

    toggleMode: function()
    {
      this.$els.body.toggleClass('is-testing', currentState.get('mode') === 'testing');
    },

    animateLicenseInfo: function()
    {
      var $license = this.$els.license.removeClass('dashboard-license-animate');

      if (!$license.is(':visible'))
      {
        return;
      }

      this.timers.licenseAdd = setTimeout(function() { $license.addClass('dashboard-license-animate'); }, 1000);
    },

    updateHotkeys: function()
    {
      if (this.$els.hotkeys === null)
      {
        var page = this;

        this.$els.hotkeys = {};

        this.$('kbd[data-hotkey]').each(function()
        {
          var hotkey = this.dataset.hotkey;

          page.$els.hotkeys[hotkey] = page.$els.hotkeys[hotkey]
            ? page.$([this].concat(page.$els.hotkeys[hotkey][0]))
            : page.$(this);
        });
      }

      var hotkeys = settings.get('hotkeys');

      _.forEach(this.$els.hotkeys, function($hotkey, key)
      {
        var hotkey = hotkeys[key];

        if (hotkey === 'Space')
        {
          hotkey = '_';
        }

        if (!hotkey)
        {
          $hotkey.hide();
        }
        else
        {
          $hotkey.text(hotkey).show();
        }
      });
    },

    onWindowWheel: function(e)
    {
      return this.$(e.target).closest('.is-scrollable').length === 1;
    }

  });
});
