// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
