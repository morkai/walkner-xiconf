// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

module.exports = function setSettingsRoutes(app, settingsModule)
{
  var express = app[settingsModule.config.expressId];

  express.get('/settings', function(req, res)
  {
    res.send(settingsModule.export());
  });

  express.get('/settings/:name', function(req, res)
  {
    if (!settingsModule.has(req.params.name))
    {
      return res.send(404);
    }

    return res.send(settingsModule.get(req.params.name));
  });

  express.post('/settings', function(req, res, next)
  {
    if (typeof req.body !== 'object' || req.body === null)
    {
      return res.send(400);
    }

    var programmer = app[settingsModule.config.programmerId];

    if (programmer && programmer.currentState.isInProgress())
    {
      res.statusCode = 400;

      return next(new Error('LOCKED'));
    }

    settingsModule.import(req.body, function(err)
    {
      if (err)
      {
        return next(err);
      }

      return res.send(204);
    });
  });

  express.get('/settings;export', function(req, res)
  {
    var settings = settingsModule.export(req.query.password);

    res.type('application/json');
    res.attachment('XICONF_SETTINGS_' + settings.id + '.txt');
    res.send(JSON.stringify(settings, null, 2));
  });

  express.post('/settings;restart', function(req, res, next)
  {
    if (settingsModule.get('password') !== req.body.password)
    {
      res.statusCode = 400;

      return next(new Error('AUTH'));
    }

    var programmer = app[settingsModule.config.programmerId];

    if (programmer && programmer.currentState.isInProgress())
    {
      res.statusCode = 400;

      return next(new Error('LOCKED'));
    }

    res.send();

    setImmediate(function() { process.exit(666); });
  });
};
