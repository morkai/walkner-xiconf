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

  var hotkeyToActions = {};

  function isValidHotkey(hotkey)
  {
    return VALID_HOTKEYS[hotkey];
  }

  function onKeyPress(e)
  {
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
      $(window).on('keypress', onKeyPress);
      settings.on('change:hotkeys', this.cache);

      this.cache();
    },
    stop: function()
    {
      $(window).off('keypress', onKeyPress);
      settings.off('change:hotkeys', this.cache);
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
