// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/broker',
  'app/core/Viewport'
], function(
  broker,
  Viewport
) {
  'use strict';

  var viewport = new Viewport({
    el: document.body,
    selector: '#app-viewport'
  });

  broker.subscribe('router.executing', function()
  {
    window.scrollTo(0, 0);
  });

  window.viewport = viewport;

  return viewport;
});
