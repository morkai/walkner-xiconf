/*jshint maxlen:false*/

'use strict';

var path = require('path');

var BIN_PATH = path.join(__dirname, '..', 'bin');
var DATA_PATH = path.join(__dirname, '..', 'data');

var _ = require(path.join(BIN_PATH, 'walkner-xiconf/node_modules/lodash'));

var config = module.exports = require(path.join(BIN_PATH, 'walkner-xiconf/config/frontend.js'));

_.assign(config.httpServer, {
  port: /^[0-9]+$/.test(process.env.XICONF_PORT) ? +process.env.XICONF_PORT : 1337
});

_.assign(config.sqlite3, {
  dbFile: path.join(DATA_PATH, 'db.sqlite3')
});

_.assign(config.programmer, {
  httpPort: config.httpServer.port,
  featureDbPath: path.join(DATA_PATH, 'features'),
  gprsOutputFile: path.join(DATA_PATH, 'gprs-output.xml'),
  workflowFile: path.join(DATA_PATH, 'workflow.txt'),
  lastModeFile: path.join(DATA_PATH, 'lastMode.txt')
});

_.assign(config.history, {
  featureDbPath: config.programmer.featureDbPath,
  lastExportTimeFile: path.join(DATA_PATH, 'lastExportAt.txt')
});

_.assign(config.updater, {
  unzipExe: path.join(BIN_PATH, 'unzip.exe')
});

_.assign(config.settings, {
  settingsFile: path.join(DATA_PATH, 'settings.json')
});

_.assign(config.settings.defaults, {
  password: '1@3',
  featurePath1: '\\\\code1\\plrketchr8-box1\\Dokumentacja.technologiczna\\-=- Centrum dystrybucji\\Programowanie driverow\\1. Programy\\5. Multione',
  featurePath2: 'C:\\Programy_Multione',
  programmerFile: path.join(
    process.env['ProgramFiles(x86)'] || process.env.ProgramFiles,
    'Philips MultiOne Workflow\\MultiOneWorkflow.exe'
  ),
  gprsVerificationTimeout: 2 * 60 * 1000,
  gprsVerificationInputPath: '\\\\code1\\plrketchr8-box1\\GPRS\\Input',
  gprsVerificationSuccessPath: '\\\\code1\\plrketchr8-box1\\GPRS\\Success',
  gprsVerificationErrorPath: '\\\\code1\\plrketchr8-box1\\GPRS\\Error',
  gprsOrdersPath: '\\\\code1\\plrketchr8-box1\\Etykiety\\Input',
  gprsProgrammerFile: 'C:\\ICP\\CityTouchIPT.exe',
  gprsInputTemplateFile: path.join(DATA_PATH, '/gprs-input.json')
});

