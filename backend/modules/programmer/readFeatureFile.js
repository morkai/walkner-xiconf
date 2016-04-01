// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
