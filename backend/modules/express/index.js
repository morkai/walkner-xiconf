// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var path = require('path');
var _ = require('lodash');
var step = require('h5.step');
var express = require('express');
var methods = require('methods');
var ejsAmd = require('ejs-amd');
var messageFormatAmd = require('messageformat-amd');
var wrapAmd = require('./wrapAmd');
var rqlMiddleware = require('./rqlMiddleware');
var errorHandlerMiddleware = require('./errorHandlerMiddleware');
var crud = require('./crud');
var cookieParser = null;
var bodyParser = null;
var session = null;
var pmx = null;
var MongoStore = null;

try { cookieParser = require('cookie-parser'); }  catch (err) {}
try { bodyParser = require('body-parser'); }  catch (err) {}
try { session = require('express-session'); }  catch (err) {}
try { pmx = require('pmx'); }  catch (err) {}
try { MongoStore = require('./MongoStore'); }  catch (err) {}

exports.DEFAULT_CONFIG = {
  mongooseId: 'mongoose',
  staticPath: 'public',
  staticBuildPath: 'public-build',
  sessionCookieKey: 'express.sid',
  sessionCookie: {
    maxAge: null,
    path: '/',
    httpOnly: true
  },
  cookieSecret: null,
  ejsAmdHelpers: {},
  title: 'express',
  jsonBody: {},
  textBody: {},
  urlencodedBody: {}
};

exports.start = function startExpressModule(app, expressModule, done)
{
  var config = expressModule.config;
  var mongoose = app[config.mongooseId];
  var expressApp = express();

  expressModule.app = expressApp;

  expressModule.crud = crud;

  expressModule.sessionStore = mongoose
    ? new MongoStore(mongoose.connection.db)
    : session ? new session.MemoryStore() : null;

  expressModule.router = express.Router();

  expressModule.createHttpError = function(message, statusCode)
  {
    var httpError = new Error(message);
    httpError.status = statusCode || 400;

    return httpError;
  };

  methods.forEach(function(method)
  {
    expressModule[method] = function()
    {
      return expressModule.router[method].apply(expressModule.router, arguments);
    };
  });

  var production = app.options.env === 'production';
  var staticPath = config[production ? 'staticBuildPath' : 'staticPath'];

  expressApp.set('trust proxy', true);
  expressApp.set('view engine', 'ejs');
  expressApp.set('views', app.pathTo('templates'));

  if (!production)
  {
    expressApp.set('json spaces', 2);
  }

  app.broker.publish('express.beforeMiddleware', {
    module: expressModule
  });

  if (!production)
  {
    setUpDevMiddleware(staticPath);
  }

  if (config.cookieSecret && cookieParser)
  {
    expressApp.use(cookieParser(config.cookieSecret));
  }

  if (bodyParser)
  {
    expressApp.use(bodyParser.json(config.jsonBody));
    expressApp.use(bodyParser.urlencoded(_.extend({extended: false}, config.urlencodedBody)));
    expressApp.use(bodyParser.text(_.defaults({type: 'text/*'}, config.textBody)));
  }

  expressApp.use(rqlMiddleware());

  if (expressModule.sessionStore)
  {
    var sessionMiddleware = session({
      store: expressModule.sessionStore,
      key: config.sessionCookieKey,
      cookie: config.sessionCookie,
      secret: config.cookieSecret,
      saveUninitialized: true,
      resave: false,
      rolling: true
    });

    expressApp.use(function checkSessionMiddleware(req, res, next)
    {
      if (/^\/(app|assets|vendor)\//.test(req.url))
      {
        next();
      }
      else
      {
        sessionMiddleware(req, res, next);
      }
    });
  }

  expressApp.use('/', expressModule.router);

  app.broker.publish('express.beforeRouter', {
    module: expressModule
  });

  step(
    function()
    {
      app.loadDir(app.pathTo('routes'), [app, expressModule], this.next());
    },
    function(err)
    {
      if (err)
      {
        return this.skip(err);
      }

      expressApp.use(express.static(staticPath));

      if (pmx !== null)
      {
        expressApp.use(pmx.expressErrorHandler());
      }

      var errorHandlerOptions = {
        title: config.title,
        basePath: path.resolve(__dirname, '../../../')
      };

      expressApp.use(errorHandlerMiddleware(expressModule, errorHandlerOptions));
    },
    done
  );

  /**
   * @private
   * @param {string} staticPath
   */
  function setUpDevMiddleware(staticPath)
  {
    ejsAmd.wrapAmd = wrapEjsAmd.bind(null, config.ejsAmdHelpers);

    var templateUrlRe = /^\/app\/([a-zA-Z0-9\-]+)\/templates\/(.*?)\.js$/;
    var ejsAmdMiddleware = ejsAmd.middleware({
      views: staticPath
    });

    expressApp.use(function runEjsAmdMiddleware(req, res, next)
    {
      var matches = req.url.match(templateUrlRe);

      if (matches === null)
      {
        return next();
      }

      ejsAmdMiddleware(req, res, next);
    });

    expressApp.use('/app/nls/locale/', messageFormatAmd.localeMiddleware());

    expressApp.use('/app/nls/', messageFormatAmd.nlsMiddleware({
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
