// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'jquery',
  '../broker',
  '../data/currentState',
  '../data/hotkeys',
  'app/updater/templates/updating',
  'i18n!app/nls/updater'
], function(
  $,
  broker,
  currentState,
  hotkeys,
  updatingTemplate
) {
  'use strict';

  if (currentState.get('updating'))
  {
    broker.subscribe('router.executing', setTimeout.bind(window, blockUi, 1)).setLimit(1);
  }
  else
  {
    currentState.on('change:updating', blockUi);
  }

  function blockUi()
  {
    var updating = currentState.get('updating');

    if (!updating)
    {
      return;
    }

    hotkeys.stop();

    $('body').html(updatingTemplate(updating));

    broker.subscribe('socket.disconnected', function()
    {
      $('.active').removeClass('active');

      broker.subscribe('socket.connected', function()
      {
        window.location.reload();
      });
    });
  }
});
