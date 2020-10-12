// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/viewport',
  'app/user',
  'app/time',
  'app/data/settings',
  'app/data/hotkeys',
  'app/data/scanBuffer',
  'app/core/View',
  'app/core/views/DialogView',
  './PrintServiceTagDialogView',
  './OrderNoPickerDialogView',
  './Nc12PickerDialogView',
  'app/dashboard/templates/input',
  'app/dashboard/templates/orderFinishedDialog',
  'app/dashboard/templates/multipleLocalSocketsDialog'
], function(
  _,
  $,
  t,
  viewport,
  user,
  time,
  settings,
  hotkeys,
  scanBuffer,
  View,
  DialogView,
  PrintServiceTagDialogView,
  OrderNoPickerDialogView,
  Nc12PickerDialogView,
  inputTemplate,
  orderFinishedDialogTemplate,
  multipleLocalSocketsDialogTemplate
) {
  'use strict';

  var NEW_LED_PATTERN_1 = /^[0-9](63[0-9]{7}|7[0-9]{8})$/;
  var NEW_LED_PATTERN_2 = /^(19|[23][0-9])[0-5][0-9][0-3][0-9]\s+[0-9]+\s+[0-9]{12}$/;
  var LED_PATTERNS = [
    {
      pattern: '5409360076',
      serialNumber: -1,
      nc12: '913700349403',
      whole: true
    },
    {
      pattern: '5375513112',
      serialNumber: -1,
      nc12: '913701035203',
      whole: true
    },
    {
      pattern: '([0-9]{12})',
      serialNumber: -1,
      nc12: 1,
      whole: true
    },
    {
      pattern: '.*?W[0-9]+___.*?([0-9]{9})_*([0-9]{12})',
      serialNumber: 1,
      nc12: 2,
      whole: true
    },
    {
      pattern: '([0-9]{14}) [0-9]{6} .*? ([0-9]{12}) .*?',
      serialNumber: 1,
      nc12: 2,
      whole: true
    },
    {
      pattern: '([A-Z0-9]{15})PHILIPS.*?PCB([0-9]{12})',
      serialNumber: 1,
      nc12: 2
    },
    {
      pattern: '([A-Z0-9]{22})-.*?([0-9]{12})[^0-9]',
      serialNumber: 1,
      nc12: 2
    },
    {
      pattern: '.([0-9]{12}).([0-9]{5,11})',
      serialNumber: 2,
      nc12: 1
    },
    {
      pattern: '.([0-9]{5,11}).([0-9]{12})',
      serialNumber: 1,
      nc12: 2
    },
    {
      pattern: '([0-9]{10}) [0-9]{6} [0-9]{3}(?: [A-Z0-9]{3})? ([0-9]{12}) [A-Z0-9]{3}',
      serialNumber: 1,
      nc12: 2
    },
    {
      pattern: '.([0-9]+).*?([0-9]{12}).*?',
      serialNumber: 1,
      nc12: 2
    }
  ];
  var ALL_LEDS_PATTERN = new RegExp(LED_PATTERNS.map(function(d)
  {
    var pattern = d.pattern;

    d.pattern = new RegExp(d.whole ? ('^' + pattern + '$') : pattern, 'i');

    return pattern;
  }).join('|'), 'i');

  window.TEST_LED = function(input)
  {
    var nc12;
    var serialNumber;
    var ledPattern;

    for (var i = 0; i < LED_PATTERNS.length; ++i)
    {
      ledPattern = LED_PATTERNS[i];

      var matches = input.match(ledPattern.pattern);

      if (matches)
      {
        nc12 = typeof ledPattern.nc12 === 'string' ? ledPattern.nc12 : matches[ledPattern.nc12];
        serialNumber = ledPattern.serialNumber === -1 ? '????????' : matches[ledPattern.serialNumber].toUpperCase();

        break;
      }
    }

    if (nc12)
    {
      return {
        ledPattern: ledPattern,
        nc12: nc12,
        serialNumber: serialNumber
      };
    }

    return null;
  };

  return View.extend({

    template: inputTemplate,

    remoteTopics: function()
    {
      var topics = {};

      if (user.isLocal())
      {
        topics['programmer.startRequested'] = this.clickElement.bind(this, 'start');
      }

      return topics;
    },

    localTopics: {
      'hotkeys.closeDialog': function() { viewport.closeDialog(); },
      'hotkeys.focusOrderNo': function()
      {
        if (this.$id('orderNo').parent().hasClass('is-multi'))
        {
          this.showOrderNoPickerDialog();
        }
        else
        {
          this.focusElement('orderNo');
        }
      },
      'hotkeys.focusQuantity': function()
      {
        if (this.$id('orderNo').parent().hasClass('is-multi'))
        {
          this.selectNextOrderNo();
        }
        else
        {
          this.focusElement('quantity');
        }
      },
      'hotkeys.focusNc12': function()
      {
        if (this.$id('nc12').parent().hasClass('is-multi'))
        {
          this.showNc12PickerDialog();
        }
        else
        {
          this.focusElement('nc12');
        }
      },
      'hotkeys.toggleWorkMode': function() { this.clickElement('toggleWorkMode'); },
      'hotkeys.start': function() { this.clickElement('start'); },
      'hotkeys.cancel': function() { this.clickElement('cancel'); },
      'hotkeys.continue': function() { this.clickElement('continue'); },
      'hotkeys.reset': function() { this.clickElement('reset'); },
      'hotkeys.reload': function() { this.clickElement('reload'); },
      'hotkeys.printServiceTag': function() { this.clickElement('printServiceTag'); },
      'programmer.barcodeScanned': 'onBarcodeScanned',
      'serviceTagPrintRequested': function(message) { this.printServiceTag(message.serviceTag); }
    },

    events: {
      'submit': 'startOrCancel',
      'click #-reload': 'reload',
      'click #-reset': 'reset',
      'click #-continue': 'continue',
      'click #-printServiceTag': 'printServiceTag',
      'click #-toggleWorkMode': 'toggleWorkMode',
      'click .dashboard-input-nc12.is-multi': function(e)
      {
        if (e.target.classList.contains('form-control'))
        {
          this.showNc12PickerDialog();
        }
      },
      'click .dashboard-input-orderNo.is-multi': function(e)
      {
        if (e.target.classList.contains('form-control'))
        {
          this.showOrderNoPickerDialog();
        }
      }
    },

    initialize: function()
    {
      this.$els = {
        window: $(window),
        msg: null,
        orderNo: null,
        quantity: null,
        nc12: null,
        gprs: null,
        reload: null,
        reset: null,
        printServiceTag: null,
        start: null,
        cancel: null,
        toggleWorkMode: null,
        continue: null,
        inputs: null
      };

      this.listenTo(this.model, 'change', _.debounce(this.onModelChange.bind(this), 25));
      this.listenTo(this.model, 'change:remoteData', this.onRemoteDataChange);
      this.listenTo(this.model, 'change:waitingForContinue', this.onWaitingForWeightScanningChange);
      this.listenTo(this.model, 'change:waitingForHidLamps', this.onWaitingForHidLampsChange);
      this.listenTo(this.model, 'change:waitingForLeds', this.onWaitingForLedsChange);
      this.listenTo(settings, 'change', this.onSettingsChange);

      if (user.isLocal())
      {
        this.listenTo(this.model, 'change:result', this.onResultChange);
        this.$els.window
          .on('keydown.inputView', this.onKeyDown.bind(this))
          .on('keypress.inputView', this.onKeyPress.bind(this));
      }
    },

    destroy: function()
    {
      this.$els.window.off('.inputView');

      if (this.$els.msg)
      {
        viewport.msg.hide(this.$els.msg, true);
      }

      this.$els = null;
    },

    afterRender: function()
    {
      Object.keys(this.$els).forEach(function(k)
      {
        var $el = this.$id(k);

        if ($el.length)
        {
          this.$els[k] = $el;
        }
      }, this);

      this.$els.inputs = this.$('input');

      this.updateValues();
      this.toggleControls();
      this.showOrderFinishedDialog();
    },

    focusElement: function(elId)
    {
      var $el = this.$els[elId];

      if ($el && !$el.prop('disabled') && !$el.prop('readOnly'))
      {
        $el.focus().select();
      }
    },

    clickElement: function(elId)
    {
      if (this.isElementEnabled(elId))
      {
        this.$els[elId].click();
      }
    },

    isElementEnabled: function(elId)
    {
      var $el = this.$els[elId];

      return $el && !$el.prop('disabled') && $el.is(':visible');
    },

    checkWeightScanResult: function(raw, scannerId)
    {
      if (this.model.get('waitingForContinue') === 'weight:scanning')
      {
        this.socket.emit('programmer.checkWeightScanResult', this.$els.orderNo.val(), raw, scannerId);
      }
    },

    checkHidScanResult: function(raw, scannerId)
    {
      if (this.model.get('waitingForHidLamps'))
      {
        this.socket.emit('programmer.checkHidScanResult', this.$els.orderNo.val(), raw, scannerId);
      }
    },

    checkSerialNumber: function(raw, nc12, serialNumber, scannerId)
    {
      if (this.model.get('waitingForLeds'))
      {
        this.socket.emit('programmer.checkSerialNumber', this.$els.orderNo.val(), raw, nc12, serialNumber, scannerId);
      }
    },

    startOrCancel: function()
    {
      viewport.closeAllDialogs();

      if (this.model.isInProgress())
      {
        this.cancel();
      }
      else
      {
        this.start();
      }

      return false;
    },

    start: function()
    {
      if (!this.isElementEnabled('start'))
      {
        return;
      }

      var startData = this.getStartData();

      if (startData === null)
      {
        return;
      }

      if (this.model.isTestingMode() && !this.model.hasProgram())
      {
        return this.showMessage('warning', 'start:requiredProgram');
      }

      if (!this.model.isRemoteInput() && this.model.isOrderFinished())
      {
        return this.showOrderFinishedDialog();
      }

      var view = this;

      this.$els.start.prop('disabled', true);

      this.socket.emit('programmer.start', startData, function(err)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          view.showErrorMessage('start', err.message, {
            workMode: view.model.get('workMode')
          });

          view.toggleControls();
        }
      });
    },

    cancel: function()
    {
      if (!this.isElementEnabled('cancel'))
      {
        return;
      }

      var view = this;
      var $cancel = this.$els.cancel.prop('disabled', true);

      this.socket.emit('programmer.cancel', function()
      {
        if (!view.$els)
        {
          return;
        }

        $cancel.prop('disabled', false);
      });
    },

    continue: function()
    {
      if (!this.isElementEnabled('continue'))
      {
        return;
      }

      var view = this;
      var $continue = this.$els.continue.prop('disabled', true);

      this.socket.emit('programmer.continue', function()
      {
        if (!view.$els)
        {
          return;
        }

        $continue.prop('disabled', false);
      });
    },

    reload: function()
    {
      if (!this.isElementEnabled('reload'))
      {
        return;
      }

      var view = this;

      this.$els.reload.prop('disabled', true);

      this.socket.emit('programmer.reload', function(err, lastOrder)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          view.showErrorMessage('reload', err.message);
        }
        else if (!lastOrder)
        {
          view.showMessage('warning', 'reload:noOrders');
        }
        else
        {
          view.showMessage('success', 'reload:success');

          view.$els.orderNo.val(lastOrder.no);
          view.$els.quantity.val('1');
          view.$els.nc12.select();
        }

        view.$els.reload.prop('disabled', false);
      });
    },

    reset: function(done)
    {
      if (!_.isFunction(done))
      {
        done = function() {};
      }

      if (!this.isElementEnabled('reset'))
      {
        return done(new Error('UNAVAILABLE'));
      }

      var view = this;

      this.$els.reset.prop('disabled', true);

      this.socket.emit('programmer.reset', function(err)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          view.showErrorMessage('reset', err.message);
        }
        else
        {
          view.hideOrderFinishedDialog();
          view.showMessage('success', 'reset:success');

          view.$els.orderNo.val('');
          view.$els.quantity.val('');
          view.$els.nc12.val('');
        }

        view.updateValues();
        view.toggleControls();

        return done(err);
      });
    },

    printServiceTag: function(serviceTag)
    {
      if (!user.isLocal() || this.printServiceTagDialogView)
      {
        return;
      }

      if (typeof serviceTag !== 'string')
      {
        serviceTag = this.model.get('serviceTag');
      }

      var view = this;
      var orderNo = this.$els.orderNo.val();
      var counter = '';

      if (serviceTag !== null)
      {
        orderNo = parseInt(serviceTag.substr(1, 13), 10).toString();
        counter = parseInt(serviceTag.substr(-4), 10).toString();
      }

      this.printServiceTagDialogView = new PrintServiceTagDialogView({
        model: {
          orderNo: orderNo,
          counter: counter
        }
      });

      this.broker.subscribe('viewport.dialog.shown')
        .setFilter(function(dialogView) { return dialogView === view.printServiceTagDialogView; })
        .setLimit(1)
        .on('message', function() { hotkeys.stop(); });

      this.broker.subscribe('viewport.dialog.hidden')
        .setFilter(function(dialogView) { return dialogView === view.printServiceTagDialogView; })
        .setLimit(1)
        .on('message', function()
        {
          view.printServiceTagDialogView = null;

          hotkeys.start();
        });

      viewport.showDialog(this.printServiceTagDialogView, t('dashboard', 'printServiceTagDialog:title'));
    },

    toggleWorkMode: function()
    {
      if (!this.isElementEnabled('toggleWorkMode'))
      {
        return;
      }

      var view = this;
      var newWorkMode = this.model.isProgrammingMode() ? 'testing' : 'programming';

      this.$els.toggleWorkMode.prop('disabled', true);

      this.socket.emit('programmer.setWorkMode', newWorkMode, function(err)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          view.showErrorMessage('setWorkMode', err.message);
        }
        else
        {
          view.showMessage('success', 'setWorkMode:success');
        }

        view.$els.toggleWorkMode.prop('disabled', false);
      });
    },

    selectNextOrderNo: function()
    {
      viewport.closeAllDialogs();

      this.selectOrderNo(this.model.getNextOrderNo());
    },

    selectOrderNo: function(orderNo, done)
    {
      if (this.model.isInProgress() || !this.model.isRemoteInput() || orderNo === this.model.get('selectedOrderNo'))
      {
        return;
      }

      var view = this;
      var $orderNo = this.$('.dashboard-input-orderNo');

      if ($orderNo.hasClass('is-selecting'))
      {
        return;
      }

      $orderNo.addClass('is-selecting');

      this.socket.emit('programmer.selectOrderNo', orderNo, function(err)
      {
        if (!view.$els)
        {
          return;
        }

        $orderNo.removeClass('is-selecting');

        if (done)
        {
          return done(err);
        }

        if (err)
        {
          view.showErrorMessage('selectOrderNo', err.message);
        }
        else
        {
          viewport.closeAllDialogs();

          view.showMessage('success', 'selectOrderNo:success');
        }
      });
    },

    selectNc12: function(nc12, password, done)
    {
      var view = this;
      var $nc12 = this.$('.dashboard-input-nc12');

      if ($nc12.hasClass('is-selecting'))
      {
        return;
      }

      $nc12.addClass('is-selecting');

      this.socket.emit('programmer.selectNc12', nc12, password, function(err)
      {
        if (!view.$els)
        {
          return;
        }

        $nc12.removeClass('is-selecting');

        if (done)
        {
          return done(err);
        }

        if (err)
        {
          view.showErrorMessage('selectNc12', err.message);
        }
        else
        {
          viewport.closeAllDialogs();

          view.showMessage('success', 'selectNc12:success');
        }
      });
    },

    showMessage: function(type, text, data)
    {
      if (this.$els.msg)
      {
        viewport.msg.hide(this.$els.msg, true);
      }

      this.$els.msg = viewport.msg.show({
        type: type,
        time: type === 'success' ? 1500 : type === 'warning' ? 2000 : 2500,
        text: t('dashboard', 'msg:' + text, data)
      });
    },

    showErrorMessage: function(type, text, data)
    {
      var message = type + ':';

      if (t.has('dashboard', 'msg:' + message + text))
      {
        message += text;
      }
      else
      {
        message += 'failure';
      }

      if (text === 'MULTIPLE_LOCAL_SOCKETS')
      {
        this.showMultipleLocalSocketsWarning(t('dashboard', 'msg:' + message, data));
      }
      else
      {
        this.showMessage('error', message, data);
      }
    },

    showMultipleLocalSocketsWarning: function(message)
    {
      var dialogView = new View({
        dialogClassName: 'dashboard-input-multipleLocalSocketsDialog',
        template: function()
        {
          return multipleLocalSocketsDialogTemplate({
            message: message
          });
        }
      });

      viewport.closeAllDialogs();
      viewport.showDialog(dialogView, t('dashboard', 'multipleLocalSocketsDialog:title'));
    },

    toggleControls: function()
    {
      if (!this.$els)
      {
        return;
      }

      var model = this.model;
      var isInProgress = model.isInProgress();
      var $els = this.$els;

      if (user.isLocal())
      {
        var isRemoteInput = model.isRemoteInput();
        var orders = settings.get('orders');
        var ordersDisabled = orders === 'disabled';
        var ordersRequired = orders === 'required';
        var hasOrder = model.hasOrder();
        var orderFieldDisabled = isInProgress || isRemoteInput || hasOrder || ordersDisabled;
        var countdown = model.get('countdown') >= 0;
        var waitingForContinue = model.get('waitingForContinue');
        var t24vdcEnabled = !!settings.get('testingEnabled');
        var glp2Enabled = !!settings.get('glp2Enabled');
        var ftEnabled = !!settings.get('ftEnabled');
        var ftInactive = !!this.$('.is-ft-disabled').length;
        var hidEnabled = !!settings.get('hidEnabled');
        var hidInactive = !!this.$('.is-hid-disabled').length;

        $els.orderNo
          .prop('readOnly', orderFieldDisabled || countdown)
          .prop('required', ordersRequired);
        $els.quantity
          .prop('disabled', orderFieldDisabled || countdown)
          .prop('required', ordersRequired);
        $els.nc12.prop('readOnly', isInProgress || isRemoteInput || hasOrder || countdown || ftEnabled || hidEnabled);
        $els.start.prop('disabled', countdown || (ftEnabled && ftInactive) || (hidEnabled && hidInactive));
        $els.toggleWorkMode
          .prop('disabled', isInProgress || countdown || glp2Enabled)
          .css('display', glp2Enabled && !t24vdcEnabled ? 'none' : '');
        $els.continue.prop('disabled', waitingForContinue === null || waitingForContinue === 'glp2');
        $els.reset.prop('disabled', isInProgress || countdown);
        $els.reload.prop('disabled', isInProgress || hasOrder || countdown);
      }
      else
      {
        $els.inputs.prop('disabled', true);
        $els.start.prop('disabled', true);
        $els.cancel.prop('disabled', true);
        $els.toggleWorkMode.prop('disabled', true);
        $els.continue.prop('disabled', true);
        $els.reset.prop('disabled', true);
        $els.reload.prop('disabled', true);
        $els.printServiceTag.prop('disabled', true);
      }

      if (!$els.orderNo.prop('disabled') && !$els.orderNo.prop('readOnly'))
      {
        $els.orderNo.focus().select();
      }
      else if (!$els.nc12.prop('disabled') && !$els.nc12.prop('readOnly'))
      {
        $els.nc12.focus().select();
      }
    },

    updateValues: function()
    {
      var $els = this.$els;

      if (!$els || !$els.inputs)
      {
        return;
      }

      var isRemoteInput = this.model.isRemoteInput();
      var multiOrderNo = false;
      var orderData;

      if (isRemoteInput)
      {
        var remoteData = this.model.get('remoteData');

        if (Array.isArray(remoteData) && remoteData.length > 1)
        {
          multiOrderNo = !settings.get('forceLatestOrder');
        }

        orderData = this.model.getSelectedRemoteData() || {
          _id: null,
          quantityTodo: null,
          quantityDone: null,
          items: []
        };
      }
      else
      {
        var localOrder = this.model.get('order');
        var localNc12 = this.model.get('nc12');

        if (localOrder)
        {
          orderData = {
            _id: localOrder.no,
            quantityTodo: localOrder.quantity,
            quantityDone: localOrder.successCounter,
            items: []
          };
        }
        else
        {
          orderData = {
            _id: null,
            quantityTodo: null,
            quantityDone: null,
            items: []
          };
        }

        if (localNc12)
        {
          orderData.items.push({
            kind: 'program',
            nc12: localNc12
          });
        }
      }

      $els.orderNo
        .val(orderData._id || '')
        .closest('div')
        .toggleClass('is-multi', user.isLocal() && !this.model.isInProgress() && multiOrderNo);

      var programItems = [];
      var ledItems = [];
      var hidItems = [];
      var gprsItems = [];
      var testItems = [];
      var ftItem = null;
      var weightItem = null;

      _.forEach(orderData.items, function(item)
      {
        if (item.kind === 'program')
        {
          programItems.push(item);
        }
        else if (item.kind === 'led')
        {
          ledItems.push(item);
        }
        else if (item.kind === 'hid')
        {
          hidItems.push(item);
        }
        else if (item.kind === 'gprs')
        {
          gprsItems.push(item);
        }
        else if (item.kind === 'test')
        {
          testItems.push(item);
        }
        else if (item.kind === 'ft')
        {
          ftItem = item;
        }
        else if (item.kind === 'weight')
        {
          weightItem = item;
        }
      });

      var selectedProgramItem = _.findWhere(programItems, {nc12: this.model.get('selectedNc12')});
      var selectedTestItem = _.findWhere(testItems, {nc12: this.model.getProgramId()});
      var isTestingEnabled = !!settings.get('glp2Enabled');
      var isLedsEnabled = !!settings.get('ledsEnabled');
      var isHidEnabled = !!settings.get('hidEnabled');
      var isFtEnabled = !!settings.get('ftEnabled');
      var isWeightEnabled = !!settings.get('weightEnabled') && isRemoteInput;
      var isFtActive = this.model.isFtActive();
      var isHidActive = this.model.isHidActive();
      var isNoProgramming = !isFtEnabled && !isHidEnabled && !isWeightEnabled && this.model.isNoProgramming();
      var isMultiNc12 = programItems.length > 1;
      var isLedOnly = user.isLocal()
        && isLedsEnabled
        && isRemoteInput
        && !this.model.hasProgram()
        && !programItems.length
        && !hidItems.length
        && !isWeightEnabled
        && ledItems.length > 0;
      var isTestOnly = isTestingEnabled && !isLedsEnabled && isNoProgramming;
      var quantityTodo = orderData.quantityTodo;
      var quantityDone = orderData.quantityDone;
      var nc12 = '';

      if (!isNoProgramming && programItems.length)
      {
        if (programItems.length === 1)
        {
          selectedProgramItem = programItems[0];
        }

        nc12 = selectedProgramItem ? selectedProgramItem.nc12 : '';
      }

      if (isWeightEnabled || isHidEnabled || isFtEnabled || isNoProgramming)
      {
        nc12 = '';
      }

      var isMulti = user.isLocal() && !this.model.isInProgress() && isMultiNc12;
      var isNoProgram = isTestingEnabled && !isLedOnly && !isNoProgramming && !selectedProgramItem && !isMulti;

      $els.nc12
        .val(nc12)
        .parent('div')
        .toggleClass('is-ledOnly', isLedOnly)
        .toggleClass('is-weight-enabled', isWeightEnabled)
        .toggleClass('is-ft-enabled', isFtEnabled && isFtActive)
        .toggleClass('is-ft-disabled', isFtEnabled && !isFtActive)
        .toggleClass('is-hid-enabled', isHidEnabled && isHidActive)
        .toggleClass('is-hid-disabled', isHidEnabled && !isHidActive)
        .toggleClass('is-noProgramming', isNoProgramming && !isLedOnly && !isTestOnly && isLedsEnabled)
        .toggleClass('is-testOnly', isTestOnly)
        .toggleClass('is-noProgram', isNoProgram)
        .toggleClass('is-multi', isMulti && !isNoProgramming)
        .toggleClass('is-picked', nc12 !== '');

      if (isWeightEnabled)
      {
        quantityDone = weightItem ? weightItem.quantityDone : 0;
      }
      else if (isFtEnabled)
      {
        quantityDone = ftItem ? ftItem.quantityDone : 0;
      }
      else if (isHidEnabled)
      {
        quantityDone = 0;

        _.forEach(hidItems, function(hidItem)
        {
          var quantityPerScan = hidItem.quantityTodo / orderData.quantityTodo;

          quantityDone += hidItem.quantityDone / quantityPerScan;
        });

        quantityDone /= hidItems.length;
      }
      else if (isTestOnly)
      {
        if (selectedTestItem)
        {
          quantityTodo = selectedTestItem.quantityTodo;
          quantityDone = selectedTestItem.quantityDone;
        }
        else
        {
          quantityTodo = orderData.quantityTodo;
          quantityDone = 0;
        }
      }
      else if (isNoProgramming && ledItems.length)
      {
        quantityDone = 0;

        _.forEach(ledItems, function(ledItem)
        {
          var quantityPerScan = ledItem.quantityTodo / orderData.quantityTodo;

          quantityDone += ledItem.quantityDone / quantityPerScan;
        });

        quantityDone /= ledItems.length;

        if (isTestingEnabled && selectedTestItem)
        {
          quantityTodo += selectedTestItem.quantityTodo;
          quantityDone += selectedTestItem.quantityDone;
        }
      }
      else if (!isLedsEnabled && ledItems.length && selectedProgramItem)
      {
        var quantityPerProgram = selectedProgramItem.quantityTodo / orderData.quantityTodo;

        quantityDone = (selectedProgramItem.quantityDone + selectedProgramItem.extraQuantityDone) / quantityPerProgram;
      }

      var quantity = Math.floor((quantityTodo - quantityDone) * 10) / 10;

      if (!orderData._id || isNaN(quantity))
      {
        $els.quantity.val('').removeClass('is-overflow');
      }
      else
      {
        $els.quantity.val(Math.abs(quantity)).toggleClass('is-overflow', quantity < 0);
      }

      var isGprs = false;

      if (isRemoteInput
        && selectedProgramItem
        && gprsItems.length === 1
        && this.model.isProgrammingMode()
        && settings.supportsFeature('gprs'))
      {
        isGprs = true;

        this.$els.gprs.val(gprsItems[0].nc12);
      }

      this.$el.toggleClass('is-gprs', isGprs);
    },

    isNc12Required: function()
    {
      if (settings.get('ftEnabled') || settings.get('hidEnabled') || settings.get('weightEnabled'))
      {
        return false;
      }

      if (this.model.isNoProgramming())
      {
        return false;
      }

      if (this.$els.nc12.parent().hasClass('is-ledOnly'))
      {
        return false;
      }

      if (this.model.hasProgramStep('sol'))
      {
        return true;
      }

      return !this.model.hasProgram();
    },

    getStartData: function()
    {
      var isRemoteInput = this.model.isRemoteInput();
      var remoteData = isRemoteInput ? this.model.getSelectedRemoteData() : null;
      var nc12 = this.$els.nc12.val().trim();

      if (this.model.isNoProgramming() || !/^[0-9]{12}$/.test(nc12))
      {
        nc12 = '';
      }

      if (nc12 === '' && this.isNc12Required())
      {
        this.showMessage('warning', 'start:requiredNc12');
        this.$els.nc12.select();

        return null;
      }

      var orders = isRemoteInput ? 'required' : settings.get('orders');

      if (orders === 'disabled')
      {
        return {
          orderNo: null,
          quantity: null,
          nc12: nc12
        };
      }

      var ordersRequired = orders === 'required';
      var orderNo = this.$els.orderNo.val().trim();

      if (!/^[0-9]{1,9}$/.test(orderNo))
      {
        if (ordersRequired)
        {
          this.showMessage('warning', 'start:requiredOrderNo');
          this.$els.orderNo.select();

          return null;
        }

        orderNo = null;
      }

      var quantity;

      if (remoteData)
      {
        quantity = remoteData.quantityTodo;
      }
      else
      {
        var order = this.model.get('order');

        quantity = order && order.no === orderNo ? order.quantity : parseInt(this.$els.quantity.val(), 10);
      }

      if (isNaN(quantity) || quantity < 1 || quantity > 9999)
      {
        if (ordersRequired)
        {
          this.showMessage('warning', 'start:requiredQuantity');
          this.$els.quantity.select();

          return null;
        }

        quantity = null;
      }

      return {
        orderNo: orderNo,
        quantity: quantity,
        nc12: nc12
      };
    },

    onModelChange: function()
    {
      this.updateValues();
      this.toggleControls();
    },

    onResultChange: function()
    {
      var cancelDelay = parseInt(settings.get('cancelDelay'), 10);

      if (this.timers.cancelDelay)
      {
        clearTimeout(this.timers.cancelDelay);
        this.timers.cancelDelay = null;
      }

      if (cancelDelay > 0 && this.model.isInProgress())
      {
        this.$els.cancel.attr('disabled', true);

        this.timers.cancelDelay = setTimeout(enableCancelAction, cancelDelay, this);
      }

      if (this.model.get('result') === null)
      {
        this.hideOrderFinishedDialog();
      }
      else
      {
        this.showOrderFinishedDialog();
      }

      function enableCancelAction(view)
      {
        view.$els.cancel.attr('disabled', false);

        view.timers.cancelDelay = null;
      }
    },

    onRemoteDataChange: function()
    {
      this.updateOrderFinishedDialog();
    },

    onWaitingForWeightScanningChange: function()
    {
      if (this.model.get('waitingForContinue') !== 'weight:scanning')
      {
        scanBuffer.clear();

        return;
      }

      var weighedComponent = scanBuffer.get().pop();

      if (weighedComponent)
      {
        this.checkWeightScanResult(weighedComponent.raw, weighedComponent.scannerId);
      }
    },

    onWaitingForHidLampsChange: function()
    {
      if (!this.model.get('waitingForHidLamps'))
      {
        scanBuffer.clear();

        return;
      }

      var hidLamps = scanBuffer.get();

      for (var i = 0; i < hidLamps.length; ++i)
      {
        var hidLamp = hidLamps[i];

        this.checkHidScanResult(hidLamp.raw, hidLamp.scannerId);
      }
    },

    onWaitingForLedsChange: function()
    {
      if (!this.model.get('waitingForLeds'))
      {
        scanBuffer.clear();

        return;
      }

      var leds = scanBuffer.get();

      for (var i = 0; i < leds.length; ++i)
      {
        var led = leds[i];

        this.checkSerialNumber(led.raw, led.nc12, led.serialNumber, led.scannerId);
      }
    },

    onSettingsChange: function()
    {
      this.updateValues();
      this.toggleControls();
    },

    onKeyDown: function(e)
    {
      if (e.keyCode === 27 && this.$id('nc12Picker').length)
      {
        this.hideNc12Picker();
      }
    },

    onKeyPress: function(e)
    {
      if (e.charCode < 48 || e.charCode > 57)
      {
        return;
      }

      var $selectedNc12 = this.$id('nc12Picker').children().eq(+String.fromCharCode(e.charCode) - 1);

      if ($selectedNc12.length)
      {
        $selectedNc12.click();
      }
    },

    onBarcodeScanned: function(message)
    {
      if (message.event && !this.$(message.event.target).length)
      {
        message.event.preventDefault();
      }

      if (this.model.isRemoteInput())
      {
        if (settings.get('weightEnabled'))
        {
          this.handleWeightCommand(message.value);
        }
        else if (settings.get('hidEnabled'))
        {
          this.handleHidCommand(message.value.replace(/^0+/, ''), message.scannerId);
        }
        else if (settings.get('ledsEnabled'))
        {
          if (NEW_LED_PATTERN_1.test(message.value) || NEW_LED_PATTERN_2.test(message.value))
          {
            this.handleNewLedCommand(message.value, message.scannerId);
          }
          else if (ALL_LEDS_PATTERN.test(message.value))
          {
            this.handleOldLedCommand(message.value, message.scannerId);
          }
        }
      }
      else if (/^[0-9]{9}-[0-9]{3}$/.test(message.value))
      {
        this.handleOrderNoAndQuantityCommand(message.value);
      }
      else if (/^[0-9]{12}$/.test(message.value))
      {
        this.handleNc12Command(message.value, message.event ? message.event.target : null);
      }
    },

    handleWeightCommand: function(scanValue, scannerId)
    {
      if (this.model.get('waitingForContinue') === 'weight:scanning')
      {
        this.checkWeightScanResult(scanValue, scannerId);
      }
      else if (this.model.get('countdown') === -1 || !this.model.get('finishedAt'))
      {
        scanBuffer.add(scanValue, scannerId);

        this.start();
      }
    },

    handleHidCommand: function(hid, scannerId)
    {
      if (!/^[0-9]{13,20}$/.test(hid))
      {
        return;
      }

      if (this.model.get('waitingForHidLamps'))
      {
        this.checkHidScanResult(hid, scannerId);
      }
      else if (this.model.get('countdown') === -1 || !this.model.get('finishedAt'))
      {
        scanBuffer.add(hid, scannerId);

        this.start();
      }
    },

    handleNewLedCommand: function(raw, scannerId)
    {
      var now = Date.now();

      if (now - scanBuffer.new.time > 3000)
      {
        scanBuffer.new.value1 = '';
        scanBuffer.new.value2 = '';
      }

      scanBuffer.new.time = now;

      if (NEW_LED_PATTERN_1.test(raw))
      {
        scanBuffer.new.value1 = raw;
      }
      else if (NEW_LED_PATTERN_2.test(raw))
      {
        scanBuffer.new.value2 = raw;
      }

      if (!scanBuffer.new.value1 || !scanBuffer.new.value2)
      {
        return;
      }

      raw = scanBuffer.new.value1 + ' ' + scanBuffer.new.value2;

      this.handleLedCommand(raw, scannerId, {
        nc12: scanBuffer.new.value2.split(/\s+/).pop(),
        serialNumber: scanBuffer.new.value1
      });

      scanBuffer.new.value1 = '';
      scanBuffer.new.value2 = '';
    },

    handleOldLedCommand: function(raw, scannerId)
    {
      var result = window.TEST_LED(raw); // eslint-disable-line new-cap

      if (result)
      {
        this.handleLedCommand(raw, scannerId, result);
      }
    },

    handleLedCommand: function(raw, scannerId, result)
    {
      if (this.model.get('waitingForLeds'))
      {
        this.checkSerialNumber(raw, result.nc12, result.serialNumber, scannerId);
      }
      else if (this.model.get('countdown') === -1 || !this.model.get('finishedAt'))
      {
        scanBuffer.add(raw, result.nc12, result.serialNumber, scannerId);

        this.start();
      }
    },

    handleOrderNoAndQuantityCommand: function(orderNoAndQuantity)
    {
      if (this.model.isInProgress())
      {
        return this.cancel();
      }

      if (this.model.get('countdown') >= 0)
      {
        return;
      }

      var orderNo = orderNoAndQuantity.substr(0, 9);
      var quantity = +orderNoAndQuantity.substr(10);
      var orders = settings.get('orders');
      var view = this;

      if (orders !== 'disabled')
      {
        var order = this.model.get('order');

        if (this.model.isOrderFinished() || (order && (order.no !== orderNo || order.quantity !== quantity)))
        {
          this.reset(function(err)
          {
            if (!err)
            {
              view.listenToOnce(view.model, 'change', _.debounce(setValues, 50));
            }
          });
        }
        else
        {
          setValues();
        }
      }
      else
      {
        view.$els.orderNo.val('');
        view.$els.quantity.val('');
      }

      function setValues()
      {
        if (!view.$els)
        {
          return;
        }

        view.$els.orderNo.val(typeof orderNo === 'string' && orderNo.length === 9 ? orderNo : '');

        view.$els.quantity
          .val(typeof quantity === 'number' && quantity > 0 && quantity < 1000 ? quantity : '')
          .removeClass('is-overflow');

        view.$els.nc12.val('');
      }
    },

    handleNc12Command: function(nc12, target)
    {
      if (this.model.isInProgress())
      {
        return this.cancel();
      }

      if (this.model.get('countdown') >= 0)
      {
        return;
      }

      this.$els.nc12.val(typeof nc12 === 'string' && nc12.length === 12 ? nc12 : '');

      if (target && this.$(target).length)
      {
        if (target !== this.$els.nc12[0])
        {
          target.value = '';
        }
      }
      else
      {
        this.$els.start.click();
      }
    },

    showOrderNoPickerDialog: function()
    {
      if (this.model.isInProgress() || !this.model.isRemoteInput())
      {
        return;
      }

      if (viewport.currentDialog && viewport.currentDialog.dialogClassName === 'dashboard-orderNoPickerDialog')
      {
        return;
      }

      viewport.closeAllDialogs();

      var orderNoPickerDialogView = new OrderNoPickerDialogView({model: this.model});

      this.listenTo(orderNoPickerDialogView, 'orderNoPicked', function(orderNo)
      {
        if (this.model.get('selectedOrderNo') === orderNo)
        {
          viewport.closeDialog();
        }
        else
        {
          this.selectOrderNo(orderNo);
        }
      });

      this.broker.subscribe('viewport.dialog.shown')
        .setFilter(function(dialogView) { return dialogView === orderNoPickerDialogView; })
        .setLimit(1)
        .on('message', function() { hotkeys.stop(); });

      this.broker.subscribe('viewport.dialog.hidden')
        .setFilter(function(dialogView) { return dialogView === orderNoPickerDialogView; })
        .setLimit(1)
        .on('message', function() { hotkeys.start(); });

      viewport.showDialog(orderNoPickerDialogView, t('dashboard', 'orderNoPickerDialog:title'));
    },

    showNc12PickerDialog: function()
    {
      if (this.model.isInProgress() || !this.model.isRemoteInput())
      {
        return;
      }

      if (viewport.currentDialog && viewport.currentDialog.dialogClassName === 'dashboard-nc12PickerDialog')
      {
        return;
      }

      viewport.closeAllDialogs();

      var nc12PickerDialogView = new Nc12PickerDialogView({model: this.model});

      this.listenTo(nc12PickerDialogView, 'nc12Picked', function(nc12, password)
      {
        if (this.model.get('selectedNc12') === nc12)
        {
          viewport.closeDialog();
        }
        else
        {
          this.selectNc12(nc12, password);
        }
      });

      this.broker.subscribe('viewport.dialog.shown')
        .setFilter(function(dialogView) { return dialogView === nc12PickerDialogView; })
        .setLimit(1)
        .on('message', function() { hotkeys.stop(); });

      this.broker.subscribe('viewport.dialog.hidden')
        .setFilter(function(dialogView) { return dialogView === nc12PickerDialogView; })
        .setLimit(1)
        .on('message', function() { hotkeys.start(); });

      viewport.showDialog(nc12PickerDialogView, t('dashboard', 'nc12PickerDialog:title'));
    },

    showOrderFinishedDialog: function()
    {
      if (this.model.isInProgress() || !this.model.isOrderFinished())
      {
        return;
      }

      viewport.closeAllDialogs();

      var dialogView = new DialogView({
        dialogClassName: 'dashboard-orderFinishedDialog',
        template: orderFinishedDialogTemplate,
        model: this.serializeOrderFinishedDialogModel()
      });
      var view = this;

      this.listenTo(dialogView, 'answered', function(answer)
      {
        if (answer === 'reset')
        {
          view.clickElement('reset');
        }
        else if (answer === 'selectNextOrderNo')
        {
          view.selectNextOrderNo();
        }
        else if (answer === 'selectAnotherOrderNo')
        {
          view.clickElement('orderNo');
        }
      });

      viewport.showDialog(dialogView, t('dashboard', 'orderFinishedDialog:title'));
    },

    hideOrderFinishedDialog: function()
    {
      if (viewport.currentDialog && viewport.currentDialog.dialogClassName === 'dashboard-orderFinishedDialog')
      {
        viewport.closeDialog();
      }
    },

    updateOrderFinishedDialog: function()
    {
      var dialogView = viewport.currentDialog;

      if (!dialogView || dialogView.dialogClassName !== 'dashboard-orderFinishedDialog')
      {
        if (!this.model.isInProgress() && this.model.isOrderFinished())
        {
          this.showOrderFinishedDialog();
        }

        return;
      }

      var newModel = this.serializeOrderFinishedDialogModel();

      if (!newModel)
      {
        return this.hideOrderFinishedDialog();
      }

      dialogView.model = newModel;
      dialogView.render();
    },

    serializeOrderFinishedDialogModel: function()
    {
      var orderData = this.model.get('order');
      var failureCounter = orderData ? orderData.failureCounter : 0;
      var remainingOrdersCount = 0;
      var order;

      if (this.model.isRemoteInput())
      {
        var remoteData = this.model.getSelectedRemoteData();

        if (!remoteData)
        {
          return null;
        }

        order = {
          no: remoteData._id,
          quantity: remoteData.quantityTodo.toLocaleString(),
          successCounter: remoteData.quantityDone.toLocaleString(),
          failureCounter: failureCounter ? ('~' + failureCounter.toLocaleString()) : '?',
          startedAt: remoteData.startedAt,
          finishedAt: remoteData.finishedAt,
          duration: '?'
        };

        _.forEach(this.model.get('remoteData'), function(orderData)
        {
          remainingOrdersCount += orderData.status === -1 ? 1 : 0;
        });
      }
      else if (!orderData)
      {
        return null;
      }
      else
      {
        order = {
          no: orderData.no,
          quantity: orderData.quantity.toLocaleString(),
          successCounter: orderData.successCounter.toLocaleString(),
          failureCounter: failureCounter.toLocaleString(),
          startedAt: orderData.startedAt,
          finishedAt: orderData.finishedAt,
          duration: '?'
        };
      }

      if (order.startedAt && order.finishedAt)
      {
        order.duration = time.toString(time.getMoment(order.finishedAt).diff(order.startedAt) / 1000);
      }

      order.startedAt = this.formatTimeOrDateTime(order.startedAt);
      order.finishedAt = this.formatTimeOrDateTime(order.finishedAt);

      var hotkeys = settings.get('hotkeys');

      return {
        remote: this.model.isRemoteInput(),
        order: order,
        remainingOrdersCount: remainingOrdersCount,
        selectNextOrderNoHotkey: hotkeys.focusQuantity,
        selectAnotherOrderNoHotkey: hotkeys.focusOrderNo,
        closeDialogHotkey: hotkeys.closeDialog,
        resetOrderHotkey: hotkeys.reset
      };
    },

    formatTimeOrDateTime: function(ts)
    {
      if (!ts)
      {
        return '?';
      }

      var currentMoment = time.getMoment();
      var tsMoment = time.getMoment(ts);

      return tsMoment.format('YYMMDD') === currentMoment.format('YYMMDD')
        ? tsMoment.format('HH:mm:ss')
        : tsMoment.format('YYYY-MM-DD, HH:mm:ss');
    }

  });
});
