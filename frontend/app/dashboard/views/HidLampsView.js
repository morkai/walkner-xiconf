// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/user',
  'app/data/settings',
  'app/core/View',
  'app/dashboard/templates/hidLamps',
  'app/dashboard/templates/hidLamp'
], function(
  _,
  $,
  t,
  user,
  settings,
  View,
  hidLampsTemplate,
  hidLampTemplate
) {
  'use strict';

  return View.extend({

    template: hidLampsTemplate,

    localTopics: {
      'hotkeys.reset': function()
      {
        this.$id('reset').click();
      }
    },

    events: {
      'click #-reset': function()
      {
        if (!this.model.get('waitingForHidLamps'))
        {
          return;
        }

        var $reset = this.$id('reset');

        if ($reset.prop('disabled'))
        {
          return;
        }

        $reset.prop('disabled', true);

        this.socket.emit('programmer.resetHidLamps', function()
        {
          $reset.prop('disabled', false);
        });
      }
    },

    initialize: function()
    {
      this.listenTo(this.model, 'change:hidLamps', this.render);
      this.listenTo(this.model, 'change:hidLamp', this.renderHidLamp);
    },

    serialize: function()
    {
      var hidLamps = this.model.get('hidLamps') || [];

      return {
        idPrefix: this.idPrefix,
        renderHidLamp: hidLampTemplate,
        hidLamps: hidLamps.map(this.serializeHidLamp, this),
        resetHotkey: settings.get('hotkeys').reset || '?',
        resetEnabled: user.isLocal()
      };
    },

    serializeHidLamp: function(hidLamp)
    {
      var className;
      var statusIcon;
      var error = '';

      if (hidLamp.status === 'checking')
      {
        className = 'warning';
        statusIcon = 'fa-spinner fa-spin';
      }
      else if (hidLamp.status === 'checked')
      {
        className = 'success';
        statusIcon = 'fa-thumbs-up';
      }
      else if (hidLamp.status === 'waiting')
      {
        className = 'default';
        statusIcon = 'fa-question-circle';
      }
      else
      {
        className = 'danger';
        statusIcon = 'fa-thumbs-down';

        if (t.has('dashboard', 'hidLamps:error:' + hidLamp.status.message))
        {
          error = t('dashboard', 'hidLamps:error:' + hidLamp.status.message, hidLamp.status);
        }
        else
        {
          error = hidLamp.status.message;
        }
      }

      var fullScanResult = hidLamp.scanResult || '?????????????';
      var shortScanResult = fullScanResult;

      while (shortScanResult.length < 13)
      {
        shortScanResult += ' ';
      }

      if (this.options.shortenScanResult)
      {
        if (shortScanResult.length > 13)
        {
          shortScanResult = shortScanResult.substr(0, 3) + '~' + shortScanResult.substr(-4);
        }
      }

      return {
        className: className,
        statusIcon: statusIcon,
        fullScanResult: fullScanResult,
        shortScanResult: shortScanResult,
        name: hidLamp.name,
        nc12: hidLamp.nc12,
        error: error
      };
    },

    renderHidLamp: function(index, hidLamp)
    {
      var timers = this.timers;

      if (!hidLamp)
      {
        hidLamp = this.model.get('hidLamps')[index];
      }

      var $hidLamp = $(hidLampTemplate(this.serializeHidLamp(hidLamp)));

      this.$id('list').children().eq(index).replaceWith($hidLamp);

      $hidLamp.addClass('blink');

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

        $hidLamp.removeClass('blink');
      }, 200);

      $hidLamp[0].scrollIntoView(true);
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
