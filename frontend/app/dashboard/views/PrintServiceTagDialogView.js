// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/i18n',
  'app/viewport',
  'app/core/View',
  'app/dashboard/templates/printServiceTagDialog'
], function(
  t,
  viewport,
  View,
  template
) {
  'use strict';

  return View.extend({

    template: template,

    events: {
      'submit': function(e)
      {
        e.preventDefault();

        var view = this;
        var startedAt = Date.now();
        var $submit = this.$id('submit').prop('disabled', true);
        var orderNo = this.$id('orderNo').val();
        var items = this.$id('counter').val();

        this.socket.emit('programmer.printServiceTags', orderNo, items, function(err, count)
        {
          if (err)
          {
            viewport.msg.show({
              type: 'error',
              time: 2500,
              text: t('dashboard', 'printServiceTagDialog:failure')
            });
            view.$id('orderNo').select();
          }
          else
          {
            viewport.msg.show({
              type: 'info',
              time: 1000,
              text: t('dashboard', 'printServiceTagDialog:success', {orderNo: orderNo, count: count})
            });
            view.$id('counter').select();
          }

          view.timers.unlock = setTimeout(
            $submit.prop.bind($submit, 'disabled', false),
            Math.max(1, 1000 - (Date.now() - startedAt))
          );
        });
      }
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        orderNo: this.model.orderNo || '',
        counter: this.model.counter || ''
      };
    },

    onDialogShown: function()
    {
      if (this.model.orderNo === '')
      {
        this.$id('orderNo').focus();
      }
      else if (this.model.counter === '')
      {
        this.$id('counter').focus();
      }
      else
      {
        this.$id('orderNo').focus();
      }
    }

  });
});
