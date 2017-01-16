// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const startTime = Date.now();

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

const main = require('h5.main');
const config = require(process.argv[2]);

const modules = (config.modules || []).map(function(module)
{
  if (typeof module === 'string')
  {
    module = {id: module};
  }

  if (typeof module !== 'object' || module === null)
  {
    console.error("Invalid module:", module);
    process.exit(1);
  }

  if (typeof module.id !== 'string')
  {
    console.error("Module ID is required:", module);
    process.exit(1);
  }

  if (typeof module.name !== 'string')
  {
    module.name = module.id;
  }

  if (typeof module.path !== 'string')
  {
    module.path = './modules/' + module.id;
  }

  module.config = config[module.name];

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
    app.error(err.message);

    if (app.options.env !== 'production' || code !== 'MODULE_START_FAILURE' || !/port.*?already/.test(err.message))
    {
      process.exit(1);
    }
  }
};

Object.assign(app, require('./helpers'));

main(app, modules);

app.broker.subscribe('app.started').setLimit(1).on('message', function()
{
  if (requireCache.built)
  {
    requireCache.save();
    app.debug('Require cache built!');
  }

  app.timeout(5000, function()
  {
    requireCache.reset();
    app.debug('Require cache reset!');
  });
});
