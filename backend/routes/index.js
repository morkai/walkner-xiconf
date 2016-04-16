// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var _ = require('lodash');

module.exports = function startCoreRoutes(app, express)
{
  var requirejsPaths;
  var requirejsShim;

  var MODULES = JSON.stringify(app.options.modules.map(m => m.id || m));

  reloadRequirejsConfig();

  express.get('/', showIndex);

  express.get('/time', sendTime);

  express.get('/config.js', sendRequireJsConfig);

  function showIndex(req, res)
  {
    var local = req.ip === '127.0.0.1'
      || (!_.isEmpty(app.options.localSecretKey) && req.query.LOCAL === app.options.localSecretKey)
      || (req.query.LOCAL === undefined && _.includes(req.headers.cookie, 'LOCAL=1'));

    res.cookie('LOCAL', local ? '1' : '0', {
      httpOnly: true,
      signed: false,
      expires: 0
    });

    res.render('index', {
      appCache: false,
      appData: {
        LOCAL: local,
        APP_VERSION: JSON.stringify(app.options.version),
        TIME: JSON.stringify(Date.now()),
        SETTINGS: JSON.stringify(app.settings.export(null, true)),
        CURRENT_STATE: JSON.stringify(app.programmer.currentState),
        COMPUTER_NAME: JSON.stringify(app.settings.getMachineId()),
        AVAILABLE_FEATURES: JSON.stringify(app.settings.availableFeatures),
        MODULES: MODULES
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
