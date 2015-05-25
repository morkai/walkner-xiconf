/*jshint maxlen:false*/

'use strict';

var path = require('path');

var BIN_PATH = path.join(__dirname, '..', 'bin');
var DATA_PATH = path.join(__dirname, '..', 'data');

var config = module.exports = require(path.join(BIN_PATH, 'walkner-xiconf/config/frontend.js'));

config.httpServer.port = /^[0-9]+$/.test(process.env.XICONF_PORT) ? +process.env.XICONF_PORT : 1337;

config.sqlite3.dbFile = path.join(DATA_PATH, 'db.sqlite3');

config.programmer.httpPort = config.httpServer.port;
config.programmer.featureDbPath = path.join(DATA_PATH, 'features');
config.programmer.workflowFile = path.join(DATA_PATH, 'workflow.txt');
config.programmer.lastModeFile = path.join(DATA_PATH, 'lastMode.txt');

config.history.featureDbPath = config.programmer.featureDbPath;
config.history.lastExportTimeFile = path.join(DATA_PATH, 'lastExportAt.txt');

config.settings.settingsFile = path.join(DATA_PATH, 'settings.json');
config.settings.defaults.password = '1@3';
config.settings.defaults.featurePath1 = '\\\\code1\\plrketchr8-box1\\Dokumentacja.technologiczna\\-=- Centrum dystrybucji\\Programowanie driverow\\1. Programy\\5. Multione';
config.settings.defaults.featurePath2 = 'C:\\Programy_Multione';
config.settings.defaults.programmerFile = path.join(
  process.env['ProgramFiles(x86)'] || process.env.ProgramFiles,
  'Philips MultiOne Workflow\\MultiOneWorkflow.exe'
);

config.updater.unzipExe = path.join(BIN_PATH, 'unzip.exe');
