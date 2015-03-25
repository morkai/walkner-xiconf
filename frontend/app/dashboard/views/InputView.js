// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/viewport',
  'app/user',
  'app/time',
  'app/data/settings',
  'app/data/hotkeys',
  'app/core/View',
  'app/core/views/DialogView',
  './PrintServiceTagDialogView',
  'app/dashboard/templates/input',
  'app/dashboard/templates/orderFinishedDialog',
  'app/dashboard/templates/nc12Picker'
], function(
  _,
  $,
  t,
  viewport,
  user,
  time,
  settings,
  hotkeys,
  View,
  DialogView,
  PrintServiceTagDialogView,
  inputTemplate,
  orderFinishedDialogTemplate,
  nc12PickerTemplate
) {
  'use strict';

  return View.extend({

    template: inputTemplate,

    localTopics: {
      'hotkeys.focusOrderNo': function() { this.focusElement('orderNo'); },
      'hotkeys.focusQuantity': function() { this.focusElement('quantity'); },
      'hotkeys.focusNc12': function()
      {
        if (this.$id('nc12').parent().hasClass('is-multi'))
        {
          this.toggleNc12Picker();
        }
        else
        {
          this.focusElement('nc12');
        }
      },
      'hotkeys.toggleWorkMode': function() { this.clickElement('toggleWorkMode'); },
      'hotkeys.start': function() { this.clickElement('start'); },
      'hotkeys.cancel': function() { this.clickElement('cancel'); },
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
      'click #-printServiceTag': 'printServiceTag',
      'click #-toggleWorkMode': 'toggleWorkMode',
      'click .dashboard-input-nc12.is-multi': function(e)
      {
        if (e.target.classList.contains('form-control'))
        {
          this.toggleNc12Picker();
        }
      },
      'click .dashboard-nc12Picker-item': function(e)
      {
        this.selectNc12(e.currentTarget.dataset.nc12);
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
        reload: null,
        reset: null,
        printServiceTag: null,
        start: null,
        cancel: null,
        toggleWorkMode: null,
        inputs: null
      };

      this.listenTo(this.model, 'change', _.debounce(this.onModelChange.bind(this), 25));
      this.listenTo(this.model, 'change:remoteData', this.onRemoteDataChange);
      this.listenTo(settings, 'change:orders', this.toggleControls);

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

      if ($el && !$el.prop('disabled'))
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

    startOrCancel: function()
    {
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
          var text = t.has('dashboard', 'msg:start:' + err.message) ? ('start:' + err.message) : 'start:failure';

          view.showMessage('error', text, {
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

      this.socket.emit('programmer.cancel', function(err)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          view.showMessage('error', 'cancel:failure');
        }

        $cancel.prop('disabled', false);
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
          view.showMessage('error', 'reload:failure');
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
          view.showMessage('error', 'reset:failure');
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
        .on('message', function() { hotkeys.stop(); });

      this.broker.subscribe('viewport.dialog.hidden')
        .setFilter(function(dialogView) { return dialogView === view.printServiceTagDialogView; })
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
          view.showMessage('error', 'setWorkMode:failure');
        }
        else
        {
          view.showMessage('success', 'setWorkMode:success');
        }

        view.$els.toggleWorkMode.prop('disabled', false);
      });
    },

    selectNc12: function(nc12, done)
    {
      var view = this;
      var $nc12 = this.$('.dashboard-input-nc12');

      if ($nc12.hasClass('is-selecting'))
      {
        return;
      }

      $nc12.addClass('is-selecting');

      this.socket.emit('programmer.selectNc12', nc12, function(err)
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
          view.showMessage('error', 'selectNc12:failure');
        }
        else
        {
          view.showMessage('success', 'selectNc12:success');
        }

        view.hideNc12Picker();
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

        $els.orderNo
          .prop('disabled', orderFieldDisabled || countdown)
          .prop('required', ordersRequired);
        $els.quantity
          .prop('disabled', orderFieldDisabled || countdown)
          .prop('required', ordersRequired);
        $els.nc12.prop('disabled', isInProgress || isRemoteInput || hasOrder || countdown);
        $els.start.prop('disabled', countdown);
        $els.toggleWorkMode.prop('disabled', isInProgress || countdown);
        $els.reset.prop('disabled', isInProgress || countdown);
        $els.reload.prop('disabled', isInProgress || hasOrder || countdown);
      }
      else
      {
        $els.inputs.prop('disabled', true);
        $els.start.prop('disabled', true);
        $els.cancel.prop('disabled', true);
        $els.toggleWorkMode.prop('disabled', true);
        $els.reset.prop('disabled', true);
        $els.reload.prop('disabled', true);
        $els.printServiceTag.prop('disabled', true);
      }

      if (!$els.orderNo.prop('disabled'))
      {
        $els.orderNo.focus().select();
      }
      else if (!$els.nc12.prop('disabled'))
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

      var data;

      if (this.model.isRemoteInput())
      {
        data = this.model.get('remoteData') || {
          orderNo: null,
          nc12: [],
          quantityTodo: null,
          quantityDone: null
        };
      }
      else
      {
        var localOrder = this.model.get('order');
        var localNc12 = this.model.get('nc12');

        if (localOrder)
        {
          data = {
            orderNo: localOrder.no,
            nc12: [],
            quantityTodo: localOrder.quantity,
            quantityDone: localOrder.successCounter
          };
        }
        else
        {
          data = {
            orderNo: null,
            nc12: [],
            quantityTodo: null,
            quantityDone: null
          };
        }

        if (localNc12)
        {
          data.nc12.push({_id: localNc12});
        }
      }

      $els.orderNo.val(data.orderNo || '');

      var nc12;
      var selectedNc12 = _.findWhere(data.nc12, {_id: this.model.get('selectedNc12')});
      var multi = data.nc12.length > 1;
      var quantityTodo = data.quantityTodo;
      var quantityDone = data.quantityDone;

      if (data.nc12.length)
      {
        if (data.nc12.length === 1)
        {
          nc12 = data.nc12[0]._id;
        }
        else if (selectedNc12)
        {
          nc12 = selectedNc12._id;
          quantityTodo = selectedNc12.quantityTodo;
          quantityDone = selectedNc12.quantityDone;
        }
        else
        {
          var completed = 0;

          _.forEach(data.nc12, function(nc12)
          {
            if (nc12.quantityDone >= nc12.quantityTodo)
            {
              completed += 1;
            }
          });

          if (completed !== data.nc12.length)
          {
            quantityDone = 0;

            _.forEach(data.nc12, function(nc12)
            {
              quantityDone += nc12.quantityDone > nc12.quantityTodo ? nc12.quantityTodo : nc12.quantityDone;
            });
          }

          nc12 = '????????????';
        }
      }

      $els.nc12.val(nc12).closest('div').toggleClass('is-multi', user.isLocal() && !this.model.isInProgress() && multi);

      var quantity = quantityTodo - quantityDone;

      if (!data.orderNo || isNaN(quantity))
      {
        $els.quantity.val('').removeClass('is-overflow');
      }
      else
      {
        $els.quantity.val(Math.abs(quantity)).toggleClass('is-overflow', quantity < 0);
      }
    },

    getStartData: function()
    {
      var remoteData = this.model.isRemoteInput() ? this.model.get('remoteData') : null;
      var nc12 = this.$els.nc12.val().trim();

      if (!/^[0-9]{12}$/.test(nc12))
      {
        this.showMessage('warning', 'start:requiredNc12');
        this.$els.nc12.select();

        return null;
      }

      var orders = settings.get('orders');

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

      if (!/^[0-9]{9}$/.test(orderNo))
      {
        if (ordersRequired)
        {
          this.showMessage('warning', 'start:requiredOrderNo');
          this.$els.orderNo.select();

          return null;
        }
        else
        {
          orderNo = null;
        }
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

      if (isNaN(quantity) || quantity < 1 || quantity > 999)
      {
        if (ordersRequired)
        {
          this.showMessage('warning', 'start:requiredQuantity');
          this.$els.quantity.select();

          return null;
        }
        else
        {
          quantity = null;
        }
      }

      return {
        orderNo: orderNo,
        quantity: quantity,
        nc12: nc12
      };
    },

    onModelChange: function()
    {
      var changed = this.model.changedAttributes();

      this.updateValues();
      this.toggleControls();

      if (changed.selectedNc12 === undefined)
      {
        this.hideNc12Picker();
      }
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
      if (this.model.isRemoteInput())
      {
        return;
      }

      if (message.event && !this.$(message.event.target).length)
      {
        message.event.preventDefault();
      }

      if (/^[0-9]{9}-[0-9]{3}$/.test(message.value))
      {
        this.handleOrderNoAndQuantityCommand(message.value);
      }
      else if (/^[0-9]{12}$/.test(message.value))
      {
        this.handleNc12Command(message.value, message.event ? message.event.target : null);
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

    showOrderFinishedDialog: function()
    {
      if (!this.model.isOrderFinished())
      {
        return;
      }

      this.hideOrderFinishedDialog();

      var dialogView = new DialogView({
        dialogClassName: 'dashboard-orderFinishedDialog',
        template: orderFinishedDialogTemplate,
        model: this.serializeOrderFinishedDialogModel()
      });
      var view = this;

      this.listenTo(dialogView, 'answered', function(answer)
      {
        if (answer === 'yes')
        {
          view.clickElement('reset');
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
      var order;

      if (this.model.isRemoteInput())
      {
        var remoteData = this.model.get('remoteData');

        if (!remoteData || !remoteData.orderNo)
        {
          return null;
        }

        order = {
          no: remoteData.orderNo,
          quantity: remoteData.quantityTodo.toLocaleString(),
          successCounter: remoteData.quantityDone.toLocaleString(),
          failureCounter: failureCounter ? ('~' + failureCounter.toLocaleString()) : '?',
          startedAt: remoteData.startedAt,
          finishedAt: remoteData.finishedAt,
          duration: '?'
        };
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
        order.duration = time.toString((order.finishedAt - order.startedAt) / 1000);
      }

      order.startedAt = this.formatTimeOrDateTime(order.startedAt);
      order.finishedAt = this.formatTimeOrDateTime(order.finishedAt);

      return {
        remote: this.model.isRemoteInput(),
        order: order,
        resetOrderHotkey: settings.get('hotkeys').reset
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
    },

    isSelectingNc12: function()
    {
      return this.$('.dashboard-input-nc12.is-selecting').length === 1;
    },

    toggleNc12Picker: function()
    {
      if (!user.isLocal() || this.model.isInProgress())
      {
        return;
      }

      var visible = this.$id('nc12Picker').length === 1;

      if (visible)
      {
        this.selectNc12(null, this.hideNc12Picker.bind(this));
      }
      else
      {
        this.selectNc12(null, this.showNc12Picker.bind(this));
      }
    },

    showNc12Picker: function()
    {
      if (this.isSelectingNc12())
      {
        return;
      }

      var templateData = {
        idPrefix: this.idPrefix,
        nc12s: this.model.get('remoteData').nc12
      };

      $(nc12PickerTemplate(templateData))
        .hide()
        .appendTo(this.$els.nc12.parent())
        .stop()
        .slideDown('fast');
    },

    hideNc12Picker: function()
    {
      if (this.isSelectingNc12())
      {
        return;
      }

      var $picker = this.$id('nc12Picker');

      if ($picker.length)
      {
        $picker.stop().slideUp('fast', function() { $picker.remove(); });
      }
    }

  });
});
