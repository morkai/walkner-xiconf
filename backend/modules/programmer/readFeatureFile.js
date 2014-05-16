// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var fs = require('fs');

module.exports = function findFeatureFile(featureFile, timeout, done)
{
  timeout = parseInt(timeout, 10);

  if (isNaN(timeout) || timeout < 100)
  {
    timeout = 30000;
  }

  var timer = setTimeout(cancel, timeout);
  var cancelled = false;

  function cancel()
  {
    if (cancelled)
    {
      return;
    }

    clearTimeout(timer);
    timer = null;
    cancelled = true;

    return done(null, false);
  }

  fs.readFile(featureFile, {encoding: 'utf8'}, function(err, feature)
  {
    if (cancelled)
    {
      return;
    }

    clearTimeout(timer);

    return done(err, feature);
  });

  return cancel;
};
