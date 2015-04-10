// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'jquery',
  'app/user',
  'app/i18n',
  'app/viewport',
  'app/data/settings',
  'app/data/currentState',
  'app/data/hotkeys',
  'app/data/barcodeScanner',
  'app/core/View',
  'app/history/HistoryEntryCollection',
  '../views/InputView',
  '../views/LogView',
  '../views/HistoryView',
  '../views/CarouselView',
  '../views/ProgramView',
  '../views/LedsView',
  'app/dashboard/templates/page'
], function(
  _,
  $,
  user,
  t,
  viewport,
  settings,
  currentState,
  hotkeys,
  barcodeScanner,
  View,
  HistoryEntryCollection,
  InputView,
  LogView,
  HistoryView,
  CarouselView,
  ProgramView,
  LedsView,
  template
) {
  'use strict';

  return View.extend({

    layoutName: 'page',

    pageId: 'dashboard',

    template: template,

    localTopics: {
      'socket.connected': 'toggleConnectionIndicator',
      'socket.disconnected': 'toggleConnectionIndicator',
      'hotkeys.toggleInputMode': function() { this.toggleInputMode(); }
    },

    events: {
      'click #-toggleInputMode': function() { this.toggleInputMode(); },
      'click #-continue': function() { this.broker.publish('hotkeys.continue'); },
      'submit #-inputModeForm': function()
      {
        var $password = this.$id('password');
        var password = $password.val();

        $password.val('');

        if (password === '')
        {
          this.hideInputModeForm();
        }
        else
        {
          this.toggleInputMode(password);
        }

        return false;
      },
      'focus #-password': function()
      {
        hotkeys.stop();
      },
      'blur #-password': function()
      {
        hotkeys.start();
        this.hideInputModeForm();
      },
      'click #-connection': 'reconnectToProdLine'
    },

    initialize: function()
    {
      this.onWindowResize = _.debounce(this.resize.bind(this), 33);
      this.toggleWindowFocus = _.debounce(this.toggleWindowFocus.bind(this), 1);
      this.$els = {
        window: $(window),
        body: $(window.document.body),
        msg: null,
        navbar: null,
        progressBar: null,
        hotkeys: null
      };

      this.defineViews();
      this.insertView('.dashboard-leftColumn', this.inputView);
      this.insertView('.dashboard-leftColumn', this.logView);
      this.insertView('.dashboard-rightColumn', this.ledsView);
      this.insertView('.dashboard-rightColumn', this.historyView);
      this.insertView('.dashboard-rightColumn', this.carouselView);
      this.insertView('.dashboard-rightColumn', this.programView);

      this.$els.window
        .on('resize.dashboard', this.onWindowResize)
        .on('wheel.dashboard', this.onWindowWheel)
        .on('focus.dashboard', this.toggleWindowFocus)
        .on('blur.dashboard', this.toggleWindowFocus)
        .on('keydown.dashboard', this.onKeyDown.bind(this));

      this.listenTo(currentState, 'change:inputMode', this.onInputModeChange);
      this.listenTo(currentState, 'change:workMode', this.onWorkModeChange);
      this.listenTo(currentState, 'change:inProgress', this.onInProgressChange);
      this.listenTo(currentState, 'change:overallProgress', this.onOverallProgressChange);
      this.listenTo(currentState, 'change:result', this.onResultChange);
      this.listenTo(currentState, 'change:remoteConnected', this.toggleConnectionIndicator);
      this.listenTo(currentState, 'change:waitingForLeds', this.onWaitingForLedsChange);
      this.listenTo(currentState, 'change:waitingForContinue', this.onWaitingForContinueChange);
      this.listenTo(settings, 'change:licenseInfo', this.onLicenseInfoChange);
      this.listenTo(settings, 'change:testingEnabled', this.onTestingEnabledChange);
      this.listenTo(settings, 'change:hotkeys', this.updateHotkeys);

      barcodeScanner.start();
    },

    destroy: function()
    {
      barcodeScanner.stop();

      this.$els.body.css('overflow', '');
      this.$els.window.off('.dashboard');

      if (this.$els.msg)
      {
        viewport.msg.hide(this.$els.msg, true);
      }

      this.$els = null;
    },

    defineViews: function()
    {
      this.inputView = new InputView({model: currentState});
      this.logView = new LogView({model: currentState});
      this.ledsView = new LedsView({model: currentState});
      this.historyView = new HistoryView({collection: new HistoryEntryCollection()});
      this.carouselView = new CarouselView({model: currentState});
      this.programView = new ProgramView({model: currentState});
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        localUser: user.isLocal(),
        windowFocused: document.hasFocus(),
        inProgress: currentState.isInProgress(),
        licenseError: !settings.isValidLicense(),
        workMode: currentState.get('workMode'),
        inputMode: currentState.get('inputMode'),
        workModeChangeEnabled: !!settings.get('testingEnabled'),
        waitingForLeds: currentState.get('waitingForLeds'),
        waitingForContinue: currentState.get('waitingForContinue'),
        progressBarClassName: this.getProgressBarClassName(),
        progressBarWidth: this.getProgressBarWidth()
      };
    },

    beforeRender: function()
    {
      this.$els.body.css('overflow', 'hidden');
    },

    afterRender: function()
    {
      this.$els.navbar = $('.navbar');
      this.$els.progressBar = this.$id('progressBar');

      this.$('.dashboard-leftColumn').append('<kbd class="is-inside" data-hotkey="focusLog">?</kbd>');

      this.toggleConnectionIndicator();
      this.animateLicenseError();
      this.updateHotkeys();

      this.timers.license = setInterval(this.animateLicenseError.bind(this), 10000);
      this.timers.resize = setTimeout(this.resize.bind(this), 1);
    },

    resize: function()
    {
      var height = this.getRemainingHeight();
      var width = Math.max(this.historyView.$el.outerWidth(true), this.ledsView.$el.outerWidth(true));

      this.logView.resize(height);
      this.carouselView.resize(width, height);
      this.programView.resize(width, height);
      this.ledsView.resize(height);
    },

    toggleConnectionIndicator: function()
    {
      var local = this.socket.isConnected();
      var remote = currentState.get('remoteConnected');
      var title = t('dashboard', 'connection:' + (remote ? 'remote' : local ? 'local' : 'no'));

      this.$el.toggleClass('is-connected-local', local);
      this.$el.toggleClass('is-connected-remote', remote);
      this.$id('connection').attr('title', title);
    },

    toggleWindowFocus: function()
    {
      this.$el.toggleClass('has-windowFocus', document.hasFocus());
    },

    toggleInputMode: function(password)
    {
      if (!user.isLocal() || currentState.isInProgress())
      {
        return;
      }

      if (password === undefined && settings.get('protectInputMode'))
      {
        return this.toggleInputModeForm();
      }

      var view = this;
      var newInputMode = currentState.isRemoteInput() ? 'local' : 'remote';

      this.socket.emit('programmer.setInputMode', newInputMode, password, function(err)
      {
        if (view.$els.msg !== null)
        {
          viewport.msg.hide(view.$els.msg, true);
        }

        if (err)
        {
          view.$els.msg = viewport.msg.show({
            type: 'error',
            time: 2000,
            text: t.has('dashboard', 'msg:setInputMode:' + err.message)
              ? t('dashboard', 'msg:setInputMode:' + err.message)
              : t('dashboard', 'msg:setInputMode:failure')
          });
        }
        else
        {
          view.$els.msg = viewport.msg.show({
            type: 'success',
            time: 2000,
            text: t('dashboard', 'msg:setInputMode:success')
          });
          view.hideInputModeForm();
        }
      });
    },

    toggleInputModeForm: function()
    {
      if (this.$id('inputModeForm').hasClass('is-hiding'))
      {
        this.showInputModeForm();
      }
      else
      {
        this.hideInputModeForm();
      }
    },

    hideInputModeForm: function()
    {
      this.$id('inputModeForm').addClass('is-hiding').stop(false).fadeOut('fast');
    },

    showInputModeForm: function()
    {
      var $form = this.$id('inputModeForm');
      var $toggleInputMode = this.$id('toggleInputMode');
      var $password = this.$id('password').val('');
      var offset = $toggleInputMode.offset();
      var height = $toggleInputMode.outerHeight();

      $form
        .css({
          top: (offset.top + height) + 'px',
          left: offset.left
        })
        .removeClass('is-hiding')
        .stop(false)
        .fadeIn('fast', function() { $password.focus(); });
    },

    getRemainingHeight: function()
    {
      return this.$els.window[0].innerHeight
        - this.$els.navbar.outerHeight(true)
        - this.$els.progressBar.outerHeight(true)
        - this.inputView.$el.outerHeight(true)
        - 14 * 4;
    },

    getProgressBarClassName: function()
    {
      if (currentState.isInProgress())
      {
        return 'progress-bar-warning progress-bar-striped active';
      }

      var result = currentState.get('result');

      if (result === 'failure')
      {
        return 'progress-bar-danger';
      }

      if (result === 'success')
      {
        return 'progress-bar-success';
      }

      return 'progress-bar-warning';
    },

    getProgressBarWidth: function()
    {
      if (currentState.isInProgress())
      {
        return Math.max(0, Math.min(100, currentState.get('overallProgress'))) + '%';
      }

      return currentState.get('result') ? '100%' : '0%';
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

    updateProgressBarClassName: function()
    {
      this.$els.progressBar[0].className = 'progress-bar ' + this.getProgressBarClassName();
    },

    animateLicenseError: function()
    {
      var $license = this.$id('licenseError').removeClass('is-animating');

      if ($license.is(':visible'))
      {
        this.timers.licenseAnimation = setTimeout(function() { $license.addClass('is-animating'); }, 1000);
      }
    },

    reconnectToProdLine: function()
    {
      if (!user.isLocal() || !this.socket.isConnected())
      {
        return;
      }

      var $connection = this.$id('connection');

      if ($connection.hasClass('is-reconnecting'))
      {
        return;
      }

      $connection.addClass('is-reconnecting');

      this.socket.emit('programmer.reconnectToProdLine', function()
      {
        $connection.removeClass('is-reconnecting');
      });
    },

    onInputModeChange: function()
    {
      this.el.dataset.inputMode = currentState.get('inputMode');
    },

    onWorkModeChange: function()
    {
      this.el.dataset.workMode = currentState.get('workMode');
    },

    onLicenseInfoChange: function()
    {
      this.$id('licenseInfo').toggle(!settings.isValidLicense());
    },

    onTestingEnabledChange: function()
    {
      this.$el.toggleClass('is-workModeChangeEnabled', !!settings.get('testingEnabled'));
    },

    onInProgressChange: function()
    {
      var inProgress = currentState.isInProgress();

      this.$el.toggleClass('is-inProgress', inProgress);
      this.$el.toggleClass('is-idle', !inProgress);

      this.updateProgressBarClassName();
    },

    onOverallProgressChange: function()
    {
      this.$els.progressBar.css('width', this.getProgressBarWidth());
    },

    onResultChange: function()
    {
      this.updateProgressBarClassName();
    },

    onWindowWheel: function(e)
    {
      return this.$(e.target).closest('.is-scrollable').length === 1;
    },

    onKeyDown: function(e)
    {
      if (e.keyCode === 27)
      {
        this.hideInputModeForm();
      }
    },

    onWaitingForLedsChange: function()
    {
      var waitingForLeds = currentState.get('waitingForLeds');

      this.$el.toggleClass('is-waitingForLeds', waitingForLeds);

      if (waitingForLeds)
      {
        this.ledsView.resize();
      }
    },

    onWaitingForContinueChange: function()
    {
      var waitingForContinue = currentState.get('waitingForContinue');

      this.$el
        .toggleClass('is-waitingForContinue', waitingForContinue !== null)
        .attr('data-waiting', waitingForContinue);
    }

  });
});