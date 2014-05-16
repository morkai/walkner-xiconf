// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var path = require('path');
var lodash = require('lodash');
var express = require('express');
var ejsAmd = require('ejs-amd');
var messageFormatAmd = require('messageformat-amd');
var MongoStore = require('./MongoStore')(express.session.Store);
var wrapAmd = require('./wrapAmd');
var rqlMiddleware = require('./rqlMiddleware');
var errorHandlerMiddleware = require('./errorHandlerMiddleware');
var crud = require('./crud');

exports.DEFAULT_CONFIG = {
  mongooseId: 'mongoose',
  staticPath: 'public',
  staticBuildPath: 'public-build',
  sessionCookieKey: 'walkner.sid',
  sessionCookie: {
    maxAge: null,
    path: '/',
    httpOnly: true
  },
  cookieSecret: null,
  ejsAmdHelpers: {},
  title: 'express'
};

exports.start = function startExpressModule(app, module, done)
{
  var mongoose = app[module.config.mongooseId];

  module = app[module.name] = lodash.merge(express(), module);

  module.crud = crud;

  var production = app.options.env === 'production';
  var staticPath = module.config[production ? 'staticBuildPath' : 'staticPath'];

  module.set('views', app.pathTo('templates'));
  module.set('view engine', 'ejs');
  module.set('static path', staticPath);

  app.broker.publish('express.beforeMiddleware', {
    module: module,
    express: express
  });

  module.use(express.static(staticPath));

  if (!production)
  {
    setUpDevMiddleware(staticPath);
  }

  if (module.config.cookieSecret)
  {
    module.use(express.cookieParser(module.config.cookieSecret));
  }

  if (mongoose)
  {
    module.sessionStore = new MongoStore(mongoose.connection.db);

    module.use(express.session({
      store: module.sessionStore,
      key: module.config.sessionCookieKey,
      cookie: module.config.sessionCookie
    }));
  }

  module.use(express.json());
  module.use(express.urlencoded());
  module.use(express.methodOverride());
  module.use(rqlMiddleware());
  module.use(module.router);

  var errorHandlerOptions = {
    title: module.config.title,
    basePath: path.resolve(__dirname, '../../../')
  };

  module.use(errorHandlerMiddleware(module, errorHandlerOptions));

  app.broker.publish('express.beforeRoutes', {
    module: module,
    express: express
  });

  app.loadDir(app.pathTo('routes'), [app, module], done);

  /**
   * @private
   * @param {string} staticPath
   */
  function setUpDevMiddleware(staticPath)
  {
    ejsAmd.wrapAmd = wrapEjsAmd.bind(null, module.config.ejsAmdHelpers);

    var templateUrlRe = /^\/app\/([a-zA-Z0-9\-]+)\/templates\/(.*?)\.js$/;
    var ejsAmdMiddleware = ejsAmd.middleware({
      views: staticPath
    });

    module.use(function(req, res, next)
    {
      var matches = req.url.match(templateUrlRe);

      if (matches === null)
      {
        return next();
      }

      ejsAmdMiddleware(req, res, next);
    });

    module.use('/app/nls/locale/', messageFormatAmd.localeMiddleware());

    module.use('/app/nls/', messageFormatAmd.nlsMiddleware({
      localeModulePrefix: 'app/nls/locale/',
      jsonPath: function(locale, nlsName)
      {
        var jsonFile = (locale === null ? 'root' : locale) + '.json';

        return path.join(staticPath, 'app', nlsName, 'nls', jsonFile);
      }
    }));
  }

  /**
   * @private
   * @param {object} ejsAmdHelpers
   * @param {string} js
   * @returns {string}
   */
  function wrapEjsAmd(ejsAmdHelpers, js)
  {
    return wrapAmd('return ' + js, ejsAmdHelpers);
  }
};
