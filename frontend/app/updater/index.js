// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
