define([
  'jquery',
  '../viewport',
  '../broker',
  './settings'
], function(
  $,
  viewport,
  broker,
  settings
) {
  'use strict';

  var VALID_HOTKEYS = {};

  [
    'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\',
    'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'",
    'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/',
    ' '
  ].forEach(function(hotkey) { VALID_HOTKEYS[hotkey] = true; });

  var enabled = false;
  var barcodeScannedSub = null;
  var hotkeyToActions = {};
  var lastKeyPressAt = 0;
  var timer = null;

  function isValidHotkey(hotkey)
  {
    return VALID_HOTKEYS[hotkey];
  }

  function onKeyPress(e)
  {
    if (timer)
    {
      clearTimeout(timer);
      timer = null;
    }

    var bgScanner = settings.get('bgScanner');
    var now = Date.now();

    if (!bgScanner && now - lastKeyPressAt < 300)
    {
      lastKeyPressAt = now;

      return;
    }

    lastKeyPressAt = now;

    if (e.ctrlKey || e.altKey || e.shiftKey)
    {
      return;
    }

    var hotkey = String.fromCharCode(e.charCode).toUpperCase();

    if (!isValidHotkey(hotkey))
    {
      return;
    }

    if (viewport.currentPage.pageId === 'dashboard')
    {
      e.preventDefault();
      e.stopPropagation();
    }
    else if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
    {
      return;
    }

    if (bgScanner)
    {
      handleHotkey(hotkey);
    }
    else
    {
      timer = setTimeout(handleHotkey, 150, hotkey);
    }
  }

  function onBarcodeScanned(message)
  {
    if (message.remote && message.value.length === 1)
    {
      handleHotkey(message.value.toUpperCase());
    }
  }

  function handleHotkey(hotkey)
  {
    var actions = hotkeyToActions[hotkey];

    if (!Array.isArray(actions))
    {
      return;
    }

    actions.forEach(function(action)
    {
      broker.publish('hotkeys.' + action);
    });
  }

  return {
    start: function()
    {
      if (enabled)
      {
        return;
      }

      $(window).on('keypress', onKeyPress);
      settings.on('change:hotkeys', this.cache);

      barcodeScannedSub = broker.subscribe('programmer.barcodeScanned', onBarcodeScanned);

      this.cache();

      enabled = true;
    },
    stop: function()
    {
      if (!enabled)
      {
        return;
      }

      $(window).off('keypress', onKeyPress);
      settings.off('change:hotkeys', this.cache);

      barcodeScannedSub.cancel();
      barcodeScannedSub = null;

      enabled = false;
    },
    cache: function()
    {
      var actionToHotkey = settings.get('hotkeys');

      hotkeyToActions = {};

      if (!actionToHotkey)
      {
        return;
      }

      Object.keys(actionToHotkey).forEach(function(action)
      {
        var hotkey = actionToHotkey[action];

        if (hotkey === 'Space')
        {
          hotkey = ' ';
        }

        if (hotkeyToActions[hotkey] === undefined)
        {
          hotkeyToActions[hotkey] = [action];
        }
        else
        {
          hotkeyToActions[hotkey].push(action);
        }
      });
    }
  };
});
