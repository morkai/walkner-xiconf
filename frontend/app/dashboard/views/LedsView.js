// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/core/View',
  'app/dashboard/templates/leds',
  'app/dashboard/templates/led'
], function(
  _,
  $,
  t,
  View,
  ledsTemplate,
  ledTemplate
) {
  'use strict';

  return View.extend({

    template: ledsTemplate,

    initialize: function()
    {
      this.listenTo(this.model, 'change:leds', this.render);
      this.listenTo(this.model, 'change:led', this.renderLed);
    },

    serialize: function()
    {
      var leds = this.model.get('leds') || [];

      return {
        idPrefix: this.idPrefix,
        renderLed: ledTemplate,
        leds: leds.map(this.serializeLed)
      };
    },

    serializeLed: function(led)
    {
      var className;
      var statusIcon;
      var error = '';

      if (led.status === 'checking')
      {
        className = 'warning';
        statusIcon = 'fa-spinner fa-spin';
      }
      else if (led.status === 'checked')
      {
        className = 'success';
        statusIcon = 'fa-thumbs-up';
      }
      else if (led.status === 'waiting')
      {
        className = 'default';
        statusIcon = 'fa-question-circle';
      }
      else
      {
        className = 'danger';
        statusIcon = 'fa-thumbs-down';

        if (t.has('dashboard', 'leds:error:' + led.status.message))
        {
          error = t('dashboard', 'leds:error:' + led.status.message, led.status);
        }
        else
        {
          error = led.status.message;
        }
      }

      return {
        className: className,
        statusIcon: statusIcon,
        serialNumber: led.serialNumber || '????????',
        name: led.name,
        nc12: led.nc12,
        error: error
      };
    },

    renderLed: function(index, led)
    {
      var timers = this.timers;

      if (!led)
      {
        led = this.model.get('leds')[index];
      }

      var $led = $(ledTemplate(this.serializeLed(led)));

      this.$id('list').children().eq(index).replaceWith($led);

      $led.addClass('blink');

      if (timers['blink' + index])
      {
        clearTimeout(timers['blink' + index]);
      }

      timers['blink' + index] = setTimeout(function()
      {
        if (timers && timers['blink' + index])
        {
          delete timers['blink' + index];
        }

        $led.removeClass('blink');
      }, 200);

      $led[0].scrollIntoView(true);
    },

    afterRender: function()
    {
      this.resize();
    },

    resize: function()
    {
      var $list = this.$id('list');
      var offsetTop = $list.offset().top;

      $list[0].style.maxHeight = (window.innerHeight - offsetTop - 14) + 'px';
    }

  });
});
