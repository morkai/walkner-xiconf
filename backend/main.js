// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const startTime = Date.now();

process.on('uncaughtException', function(err)
{
  console.error(err.stack);

  if (err.code !== 'ERR_SOCKET_CANNOT_SEND')
  {
    process.exit(1); // eslint-disable-line no-process-exit
  }
});

if (!process.env.NODE_ENV)
{
  process.env.NODE_ENV = 'development';
}

require('./extensions');

const fs = require('fs');
const requireCache = require('./requireCache');

if (process.env.NODE_ENV === 'production')
{
  requireCache.path = __dirname + '/../require-cache.json';

  try
  {
    requireCache.cache = JSON.parse(fs.readFileSync(requireCache.path, 'utf8'));
    requireCache.use();
  }
  catch (err)
  {
    requireCache.built = true;
    requireCache.build();
  }
}

const moment = require('moment');
const main = require('h5.main');
const config = require(process.argv[2]);

moment.locale('pl');

const modules = (config.modules || []).map((module, i) =>
{
  if (typeof module === 'string')
  {
    module = {id: module};
  }

  if (!module || typeof module !== 'object')
  {
    throw new Error(`Invalid type for a module definition at position ${i}.`);
  }

  if (typeof module.id !== 'string')
  {
    throw new Error(`Missing ID for a module at position ${i}.`);
  }

  if (typeof module.name !== 'string')
  {
    module.name = module.id;
  }

  if (typeof module.path !== 'string')
  {
    module.path = `${__dirname}/node_modules/${module.id}`;
  }

  if (!module.config)
  {
    module.config = config[module.name];
  }

  return module;
});

const app = {
  options: Object.assign({}, config, {
    version: require('../package.json').version,
    startTime: startTime,
    env: process.env.NODE_ENV,
    rootPath: __dirname,
    moduleStartTimeout: process.env.NODE_ENV === 'production' ? 10000 : 3000
  }),
  exit: function(code, err)
  {
    app.error(err);

    if (app.options.env !== 'production' || code !== 'MODULE_START_FAILURE' || !/port.*?already/.test(err.message))
    {
      process.exit(1); // eslint-disable-line no-process-exit
    }
  }
};

Object.assign(app, require('./helpers'));

main(app, modules);

app.broker.subscribe('app.started').setLimit(1).on('message', () =>
{
  if (requireCache.built)
  {
    requireCache.save();
    app.debug('Require cache built!');
  }

  setTimeout(() =>
  {
    requireCache.reset();
    app.debug('Require cache reset!');
  }, 5000);
});
