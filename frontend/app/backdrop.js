// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'jquery',
  'app/broker'
], function(
  $,
  broker
) {
  'use strict';

  var $backdrop = $('<div class="backdrop"></div>');

  var backdrop = {
    show: function()
    {
      $backdrop.appendTo(document.body).show();
    },
    hide: function()
    {
      $backdrop.hide();
    }
  };

  broker.subscribe('socket.connected', backdrop.hide);

  broker.subscribe('socket.disconnected', backdrop.show);

  return backdrop;
});
