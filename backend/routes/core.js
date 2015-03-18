// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

module.exports = function startCoreRoutes(app, express)
{
  var requirejsPaths;
  var requirejsShim;

  reloadRequirejsConfig();

  express.get('/', showIndex);

  express.get('/time', sendTime);

  express.get('/config.js', sendRequireJsConfig);

  function showIndex(req, res)
  {
    res.render('index', {
      appCache: false,
      appData: {
        APP_VERSION: JSON.stringify(app.options.version),
        TIME: JSON.stringify(Date.now()),
        SETTINGS: JSON.stringify(app.settings.export(null, true)),
        CURRENT_STATE: JSON.stringify(app.programmer.currentState),
        COMPUTER_NAME: JSON.stringify(process.env.COMPUTERNAME || null)
      }
    });
  }

  function sendTime(req, res)
  {
    res.send(Date.now().toString());
  }

  function sendRequireJsConfig(req, res)
  {
    res.type('js');
    res.render('config.js.ejs', {
      paths: requirejsPaths,
      shim: requirejsShim
    });
  }

  function reloadRequirejsConfig()
  {
    var configPath = require.resolve('../../config/require');

    delete require.cache[configPath];

    var requirejsConfig = require(configPath);

    requirejsPaths = JSON.stringify(requirejsConfig.paths);
    requirejsShim = JSON.stringify(requirejsConfig.shim);
  }
};
