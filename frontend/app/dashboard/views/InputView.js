// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/user',
  'app/viewport',
  'app/core/View',
  'app/core/views/DialogView',
  'app/data/settings',
  'app/data/currentState',
  'app/dashboard/templates/input',
  'app/dashboard/templates/orderFinishedDialog'
], function(
  _,
  $,
  t,
  user,
  viewport,
  View,
  DialogView,
  settings,
  currentState,
  inputTemplate,
  orderFinishedDialogTemplate
) {
  'use strict';

  var MODE_STORAGE_KEY = 'INPUT:MODE';
  var FAILURE_MSG_TIME = 3000;
  var SUCCESS_MSG_TIME = 1500;

  return View.extend({

    template: inputTemplate,

    events: {
      'submit': 'onFormSubmit',
      'click .dashboard-input-resetOrder': 'resetOrder',
      'click .dashboard-input-repeatOrder': 'repeatOrder'
    },

    localTopics: {
      'hotkeys.focusOrderNo': function() { this.focusElement('orderNo'); },
      'hotkeys.focusQuantity': function() { this.focusElement('quantity'); },
      'hotkeys.focusNc12': function() { this.focusElement('nc12'); },
      'hotkeys.toggleMode': function(){ this.clickElement('mode'); },
      'hotkeys.program': function() { this.clickElement('program'); },
      'hotkeys.cancel': function() { this.clickElement('cancel'); },
      'hotkeys.resetOrder': function() { this.clickElement('resetOrder'); },
      'hotkeys.repeatOrder': function() { this.clickElement('repeatOrder'); }
    },

    initialize: function()
    {
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyPress = this.onKeyPress.bind(this);
      this.clearCommandBuffer = this.clearCommandBuffer.bind(this);
      this.commandBuffer = '';
      this.idPrefix = _.uniqueId('input');
      this.$els = {
        mode: null,
        program: null,
        cancel: null,
        resetOrder: null,
        repeatOrder: null,
        inputs: null,
        orderNo: null,
        quantity: null,
        nc12: null,
        window: $(window)
      };
      this.mode = localStorage.getItem(MODE_STORAGE_KEY) || 'manual';

      this.listenTo(this.model, 'change', _.debounce(this.onModelChange.bind(this), 50));
      this.listenTo(settings, 'change:orders', this.toggleControls);

      if (user.isLocal())
      {
        this.listenTo(this.model, 'change:result', this.onResultChange);
        this.$els.window.on('keydown', this.onKeyDown);
        this.$els.window.on('keypress', this.onKeyPress);
      }
    },

    destroy: function()
    {
      if (user.isLocal())
      {
        this.$els.window.off('keydown', this.onKeyDown);
        this.$els.window.off('keypress', this.onKeyPress);
      }

      this.$els.mode.remove();
      this.$els = null;
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        className: 'is-' + this.mode,
        modeClassName: this.mode === 'auto' ? 'btn-success' : 'btn-warning',
        modeLabel: t('dashboard', 'input:mode:' + this.mode)
      };
    },

    beforeRender: function()
    {
      if (this.$els.mode)
      {
        this.$els.mode.remove();
      }
    },

    afterRender: function()
    {
      this.$els.inputs = this.$('input');
      this.$els.orderNo = this.$els.inputs.filter('[name=orderNo]');
      this.$els.quantity = this.$els.inputs.filter('[name=quantity]');
      this.$els.nc12 = this.$els.inputs.filter('[name=nc12]');
      this.$els.program = this.$('.dashboard-input-program');
      this.$els.cancel = this.$('.dashboard-input-cancel');
      this.$els.resetOrder = this.$('.dashboard-input-resetOrder');
      this.$els.repeatOrder = this.$('.dashboard-input-repeatOrder');
      this.$els.mode = this.$('.dashboard-input-mode')
        .appendTo('body')
        .click(this.onModeClick.bind(this))
        .focus(this.onModeFocus.bind(this));

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
      var $el = this.$els[elId];

      if ($el && !$el.prop('disabled') && $el.is(':visible'))
      {
        $el.click();
      }
    },

    toggleMode: function()
    {
      this.$el.removeClass('is-' + this.mode);

      if (this.mode === 'auto')
      {
        this.$els.mode.removeClass('btn-success').addClass('btn-warning');

        this.mode = 'manual';
      }
      else
      {
        this.$el.removeClass('is-auto');
        this.$els.mode.removeClass('btn-warning').addClass('btn-success');

        this.mode = 'auto';
      }

      this.$els.mode.text(t('dashboard', 'input:mode:' + this.mode));
      this.$el.addClass('is-' + this.mode);

      localStorage.setItem(MODE_STORAGE_KEY, this.mode);
    },

    toggleControls: function()
    {
      if (!this.$els)
      {
        return;
      }

      var isProgramming = this.model.isProgramming();

      if (user.isLocal())
      {
        var isAutoMode = this.mode === 'auto';
        var orders = settings.get('orders');
        var ordersDisabled = orders === 'disabled';
        var ordersRequired = orders === 'required';
        var hasOrder = this.model.hasOrder();
        var orderFieldDisabled = isProgramming || isAutoMode || hasOrder || ordersDisabled;
        var countdown = currentState.get('countdown') >= 0;

        this.$els.orderNo
          .prop('disabled', orderFieldDisabled || countdown)
          .prop('required', ordersRequired);
        this.$els.quantity
          .prop('disabled', orderFieldDisabled || countdown)
          .prop('required', ordersRequired);
        this.$els.nc12.prop('disabled', isProgramming || isAutoMode || countdown);
        this.$els.program.prop('disabled', isAutoMode || countdown);
        this.$els.mode.show();
        this.$els.resetOrder.prop('disabled', isProgramming || countdown);
        this.$els.repeatOrder.prop('disabled', isProgramming || hasOrder || countdown);
      }
      else
      {
        this.$els.inputs.prop('disabled', true);
        this.$els.program.prop('disabled', true);
        this.$els.cancel.prop('disabled', true);
        this.$els.mode.hide();
        this.$els.resetOrder.prop('disabled', true);
        this.$els.repeatOrder.prop('disabled', true);
      }

      this.$els.program.toggle(!isProgramming);
      this.$els.cancel.toggle(isProgramming);

      if (!this.$els.orderNo.prop('disabled'))
      {
        this.$els.orderNo.focus().select();
      }
      else if (!this.$els.nc12.prop('disabled'))
      {
        this.$els.nc12.focus().select();
      }
    },

    updateValues: function()
    {
      if (!this.$els || !this.$els.inputs)
      {
        return;
      }

      this.$els.nc12.val(this.model.get('result') === null ? (this.model.get('nc12') || '') : '');

      var order = this.model.get('order');

      if (order)
      {
        this.$els.orderNo.val(order.no);

        var quantity = order.quantity - order.successCounter;

        this.$els.quantity.val(Math.abs(quantity)).toggleClass('is-overflow', quantity < 0);
      }
      else
      {
        this.$els.orderNo.val('');
        this.$els.quantity.val('').removeClass('is-overflow');
      }
    },

    onModeClick: function()
    {
      this.toggleMode();
      this.toggleControls();
    },

    onModeFocus: function()
    {
      this.$els.mode.blur();
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

      if (cancelDelay > 0 && this.model.isProgramming())
      {
        this.$els.cancel.attr('disabled', true);

        this.timers.cancelDelay = setTimeout(enableCancelAction, cancelDelay, this);
      }

      this.showOrderFinishedDialog();

      function enableCancelAction(view)
      {
        view.$els.cancel.attr('disabled', false);

        view.timers.cancelDelay = null;
      }
    },

    onFormSubmit: function(e)
    {
      e.preventDefault();

      if (this.model.isProgramming())
      {
        this.cancel();
      }
      else
      {
        this.program();
      }
    },

    onKeyDown: function(e)
    {
      if (e.keyCode === 13 && this.commandBuffer.length)
      {
        this.handleCommandBuffer(e);
      }

      this.scheduleClearCommandBuffer();
    },

    onKeyPress: function(e)
    {
      if (e.charCode === 45 || (e.charCode >= 48 && e.charCode <= 57))
      {
        this.commandBuffer += String.fromCharCode(e.charCode);
      }

      this.scheduleClearCommandBuffer();
    },

    scheduleClearCommandBuffer: function()
    {
      if (this.timers.clearCommandBuffer)
      {
        clearTimeout(this.timers.clearCommandBuffer);
      }

      this.timers.clearCommandBuffer = setTimeout(this.clearCommandBuffer, 150);
    },

    clearCommandBuffer: function()
    {
      this.commandBuffer = '';

      clearTimeout(this.timers.clearCommandBuffer);
      this.timers.clearCommandBuffer = null;
    },

    handleCommandBuffer: function(e)
    {
      if (!this.$(e.target).length)
      {
        e.preventDefault();
      }

      if (/^[0-9]{9}-[0-9]{3}$/.test(this.commandBuffer))
      {
        this.handleOrderAndQuantityCommand();
      }
      else if (/^[0-9]{12}$/.test(this.commandBuffer))
      {
        this.handleNc12Command(e);
      }
    },

    handleOrderAndQuantityCommand: function()
    {
      if (this.model.isProgramming())
      {
        return this.cancel();
      }

      if (currentState.get('countdown') >= 0)
      {
        return;
      }

      var orderNo = this.commandBuffer.substr(0, 9);
      var quantity = +this.commandBuffer.substr(10);
      var orders = settings.get('orders');
      var view = this;

      if (orders !== 'disabled')
      {
        if (this.model.isOrderFinished())
        {
          this.resetOrder(function(err)
          {
            if (!err)
            {
              view.listenToOnce(view.model, 'change', _.debounce(setValues, 75));
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

    handleNc12Command: function(e)
    {
      if (this.model.isProgramming())
      {
        return this.cancel();
      }

      if (currentState.get('countdown') >= 0)
      {
        return;
      }

      var nc12 = this.commandBuffer;

      this.$els.nc12.val(typeof nc12 === 'string' && nc12.length === 12 ? nc12 : '');

      if (this.$(e.target).length)
      {
        if (e.target !== this.$els.nc12[0])
        {
          e.target.value = '';
        }
      }
      else
      {
        if (this.$els.program.prop('disabled'))
        {
          this.program();
        }
        else
        {
          this.$els.program.click();
        }
      }
    },

    cancel: function()
    {
      if (this.$els.cancel.prop('disabled'))
      {
        return;
      }

      var $cancel = this.$els.cancel.attr('disabled', true);
      var view = this;

      this.socket.emit('programmer.cancel', function(err)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          $cancel.attr('disabled', false);
          view.showMessage(false, 'cancel:failure');
        }
        else
        {
          view.showMessage(true, 'cancel:success');
        }
      });
    },

    program: function()
    {
      var data = this.prepareProgramData();

      if (data === null)
      {
        return this.updateValues();
      }

      if (this.model.isOrderFinished())
      {
        return this.showOrderFinishedDialog();
      }

      this.$els.inputs.attr('disabled', true);
      this.$els.program.attr('disabled', true);

      var view = this;

      this.socket.emit('programmer.program', data, function(err)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          view.toggleControls();
          view.showMessage(false, 'program:failure');
        }
      });
    },

    prepareProgramData: function()
    {
      var nc12 = this.$els.nc12.val().trim();

      if (!/^[0-9]{12}$/.test(nc12))
      {
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
          this.showMessage(false, 'requiredOrder');

          return null;
        }
        else
        {
          orderNo = null;
        }
      }

      var order = this.model.get('order');
      var quantity = order && order.no === orderNo
        ? order.quantity
        : parseInt(this.$els.quantity.val(), 10);

      if (isNaN(quantity) || quantity < 1 || quantity > 999)
      {
        if (ordersRequired)
        {
          this.showMessage(false, 'requiredOrder');

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

    showMessage: function(success, text)
    {
      if (this.$msg)
      {
        viewport.msg.hide(this.$msg, true);
      }

      this.$msg = viewport.msg.show({
        type: success ? 'success' : 'error',
        time: success ? SUCCESS_MSG_TIME : FAILURE_MSG_TIME,
        text: t('dashboard', 'msg:' + text)
      });
    },

    resetOrder: function(done)
    {
      if (typeof done !== 'function')
      {
        done = function() {};
      }

      if (this.model.isProgramming())
      {
        return done(new Error('IN_PROGRESS'));
      }

      if (!this.model.hasOrder())
      {
        this.$els.orderNo.val('').focus();
        this.$els.quantity.val('').removeClass('is-overflow');
        this.$els.nc12.val('');

        return done();
      }

      this.$els.resetOrder.attr('disabled', true);

      var view = this;

      this.socket.emit('programmer.resetOrder', function(err)
      {
        if (!view.$els)
        {
          return;
        }

        if (err)
        {
          console.error(err);

          view.showMessage(false, 'resetOrder:failure');
        }
        else
        {
          view.hideOrderFinishedDialog();
          view.showMessage(true, 'resetOrder:success');
        }

        view.toggleControls();

        return done(err);
      });
    },

    repeatOrder: function()
    {
      if (this.model.isProgramming() || this.model.hasOrder())
      {
        return;
      }

      this.$els.repeatOrder.attr('disabled', true);

      var view = this;

      this.socket.emit('programmer.repeatOrder', function(err, lastOrder)
      {
        if (!view.$els)
        {
          return;
        }

        view.toggleControls();

        if (err)
        {
          return view.showMessage(true, 'repeatOrder:false');
        }

        if (lastOrder
          && (view.$els.orderNo.val() !== lastOrder.no && view.$els.quantity.val() !== '1'))
        {
          view.$els.orderNo.val(lastOrder.no);
          view.$els.quantity.val(1);
          view.$els.nc12.val('');

          view.showMessage(true, 'repeatOrder:success');
        }

        view.$els.nc12.focus();
      });
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
        model: {
          order: this.model.get('order'),
          resetOrderHotkey: settings.get('hotkeys').resetOrder
        }
      });
      var view = this;

      this.listenTo(dialogView, 'answered', function(answer)
      {
        if (answer === 'yes')
        {
          view.clickElement('resetOrder');
        }
      });

      viewport.showDialog(dialogView, t('dashboard', 'orderFinishedDialogTemplate:title'));
    },

    hideOrderFinishedDialog: function()
    {
      if (viewport.currentDialog
        && viewport.currentDialog.dialogClassName === 'dashboard-orderFinishedDialog')
      {
        viewport.closeDialog();
      }
    }

  });
});
