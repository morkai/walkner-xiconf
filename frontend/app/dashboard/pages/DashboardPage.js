// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
  'app/core/util/embedded',
  'app/history/HistoryEntryCollection',
  '../views/InputView',
  '../views/LogView',
  '../views/HistoryView',
  '../views/CarouselView',
  '../views/ProgramView',
  '../views/LedsView',
  '../views/HidLampsView',
  '../views/ComponentWeightsView',
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
  embedded,
  HistoryEntryCollection,
  InputView,
  LogView,
  HistoryView,
  CarouselView,
  ProgramView,
  LedsView,
  HidLampsView,
  ComponentWeightsView,
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
      'click .dashboard-continue': function() { this.broker.publish('hotkeys.continue'); },
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
        hotkeys: null,
        continue: null
      };

      this.defineViews();
      this.insertView('.dashboard-leftColumn', this.inputView);
      this.insertView('.dashboard-leftColumn', this.logView);
      this.insertView('.dashboard-rightColumn', this.hidLampsView);
      this.insertView('.dashboard-rightColumn', this.ledsView);
      this.insertView('.dashboard-rightColumn', this.componentWeightsView);
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
      this.listenTo(currentState, 'change:waitingForHidLamps', this.onWaitingForHidLampsChange);
      this.listenTo(currentState, 'change:waitingForLeds', this.onWaitingForLedsChange);
      this.listenTo(currentState, 'change:waitingForComponentWeight', this.onWaitingForComponentWeightChange);
      this.listenTo(currentState, 'change:waitingForContinue', this.onWaitingForContinueChange);
      this.listenTo(currentState, 'change:selectedOrderNo', this.onSelectedOrderNoChange);
      this.listenTo(currentState, 'change:weight', this.updateWeight);
      this.listenTo(settings, 'change:licenseInfo', this.onLicenseInfoChange);
      this.listenTo(settings, 'change:testingEnabled', this.onTestingEnabledChange);
      this.listenTo(settings, 'change:hotkeys', this.updateHotkeys);
    },

    destroy: function()
    {
      barcodeScanner.stop();

      this.$els.body.css('overflow', '').removeClass('is-dashboard');
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
      this.hidLampsView = new HidLampsView({model: currentState, shortenScanResults: true});
      this.ledsView = new LedsView({model: currentState, shortenSerialNumbers: true});
      this.componentWeightsView = new ComponentWeightsView({model: currentState});
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
        workModeChangeEnabled: !settings.get('ftEnabled')
          && !settings.get('hidEnabled')
          && (settings.get('testingEnabled') || settings.get('glp2Enabled')),
        waitingForHidLamps: currentState.get('waitingForHidLamps'),
        waitingForLeds: currentState.get('waitingForLeds'),
        waitingForComponentWeight: currentState.get('waitingForComponentWeight'),
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
      barcodeScanner.start();

      this.$els.navbar = $('.navbar');
      this.$els.progressBar = this.$id('progressBar');
      this.$els.continue = this.$('.dashboard-continue');

      this.$('.dashboard-leftColumn').append('<kbd class="is-inside" data-hotkey="focusLog">?</kbd>');
      this.$els.body.addClass('is-dashboard');

      this.toggleConnectionIndicator();
      this.animateLicenseError();
      this.updateHotkeys();
      this.updateWeight();

      this.timers.license = setInterval(this.animateLicenseError.bind(this), 10000);
      this.timers.resize = setTimeout(this.resize.bind(this), 1);

      embedded.render(this, {actions: {lockUi: true}});
      embedded.ready('xiconf');
    },

    resize: function()
    {
      var height = this.getRemainingHeight();
      var width = Math.max(
        this.historyView.$el.outerWidth(true),
        this.hidLampsView.$el.outerWidth(true),
        this.ledsView.$el.outerWidth(true),
        this.componentWeightsView.$el.outerWidth(true)
      );
      var shrinked = this.$els.window[0].innerWidth <= 1024;

      if (shrinked && height < 275)
      {
        height = 275;
      }

      this.logView.resize(height);
      this.carouselView.resize(width, height);
      this.programView.resize(width, height);
      this.hidLampsView.resize(height);
      this.ledsView.resize(height);
      this.componentWeightsView.resize(height);

      this.inputView.el.style.marginBottom = shrinked
        ? ((height + this.$els.progressBar.outerHeight(true) + 3 * 14) + 'px')
        : '';

      this.$els.continue.css(shrinked ? {width: width, height: height} : {width: '', height: ''});
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
      if (currentState.isInProgress() || (!user.isLocal() && !settings.get('protectInputMode')))
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
        - this.inputView.$el.outerHeight(false)
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
            ? page.$([this].concat(page.$els.hotkeys[hotkey].get()))
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
          $hotkey.css('display', 'none');
        }
        else
        {
          $hotkey.text(hotkey).css('display', '');
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
      this.$el.toggleClass(
        'is-workModeChangeEnabled',
        !settings.get('ftEnabled') && (settings.get('testingEnabled') || settings.get('glp2Enabled'))
      );
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
      return window.innerWidth <= 1024 || this.$(e.target).closest('.is-scrollable').length === 1;
    },

    onKeyDown: function(e)
    {
      if (e.keyCode === 27)
      {
        this.hideInputModeForm();
      }
    },

    onWaitingForHidLampsChange: function()
    {
      var waitingForHidLamps = currentState.get('waitingForHidLamps');

      this.$el.toggleClass('is-waitingForHidLamps', waitingForHidLamps);

      if (waitingForHidLamps)
      {
        this.hidLampsView.resize();
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

    onWaitingForComponentWeightChange: function()
    {
      var waitingForComponentWeight = currentState.get('waitingForComponentWeight');

      this.$el.toggleClass('is-waitingForComponentWeight', !!waitingForComponentWeight);

      if (waitingForComponentWeight)
      {
        this.componentWeightsView.resize();
      }
    },

    onWaitingForContinueChange: function()
    {
      var waitingForContinue = currentState.get('waitingForContinue');

      this.$el
        .toggleClass('is-waitingForContinue', waitingForContinue !== null)
        .attr('data-waiting', waitingForContinue);

      if (waitingForContinue === 'vis')
      {
        var activeProgramStep = currentState.getActiveProgramStep();

        this.$('.dashboard-continue-vis').find('p').first().text(
          activeProgramStep ? activeProgramStep.label : t('dashboard', 'continue:vis:p1')
        );
      }
    },

    onSelectedOrderNoChange: function()
    {
      if (currentState.isFtActive())
      {
        currentState.set('waitingForContinue', 'ft');
      }
      else if (currentState.get('waitingForContinue') === 'ft')
      {
        currentState.set('waitingForContinue', null);
      }
    },

    updateWeight: function()
    {
      this.$id('weight').text((Math.round(currentState.get('weight').value * 100) / 100).toLocaleString());
    }

  });
});
