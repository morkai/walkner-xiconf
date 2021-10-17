// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const fs = require('fs');
const {execSync} = require('child_process');

if (process.platform === 'win32' && fs.existsSync(`${__dirname}/../node_modules_win32`))
{
  execSync(`mv "${__dirname}/../node_modules" "${__dirname}/../node_modules_linux"`);
  execSync(`mv "${__dirname}/../node_modules_win32" "${__dirname}/../node_modules"`);
}
else if (process.platform === 'linux' && fs.existsSync(`${__dirname}/../node_modules_linux`))
{
  execSync(`mv "${__dirname}/../node_modules" "${__dirname}/../node_modules_win32"`);
  execSync(`mv "${__dirname}/../node_modules_linux" "${__dirname}/../node_modules"`);
}

const startTime = Date.now();

process.on('uncaughtException', err =>
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

const config = require(process.argv[2]);
const requireCache = require('./requireCache');
const helpers = require('./helpers');
const moment = require('moment');
const main = require('h5.main');

require('./extensions');

if (!config.id)
{
  config.id = `unknown`;
}

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
  options: {
    ...config,
    id: config.id,
    startTime: startTime,
    env: process.env.NODE_ENV,
    rootPath: __dirname,
    moduleStartTimeout: config.moduleStartTimeout || 3000,
    version: require('../package.json').version
  },
  ...helpers
};

main(app, modules);

app.broker.subscribe('app.started').setLimit(1).on('message', () =>
{
  if (requireCache.built)
  {
    requireCache.save();

    app.debug('Require cache built!');

    setTimeout(() => process.exit(), 1000); // eslint-disable-line no-process-exit
  }

  setTimeout(() =>
  {
    requireCache.reset();

    app.debug('Require cache reset!');
  }, 5000);
});
