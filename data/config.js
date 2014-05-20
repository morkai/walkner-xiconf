/*jshint maxlen:false*/

'use strict';

var path = require('path');

var DATA_PATH = path.join(__dirname, '..', 'data');

var config = module.exports = require('../bin/walkner-xiconf/config/frontend.js');

config.httpServer.port = 1337;

config.sqlite3.dbFile = path.join(DATA_PATH, 'walkner-xiconf.sqlite3');

config.programmer.featureDbPath = path.join(DATA_PATH, 'walkner-xiconf-features');

config.history.featureDbPath = config.programmer.featureDbPath;
config.history.lastExportTimeFile = path.join(DATA_PATH, 'walkner-xiconf-export.txt');

config.settings.settingsFile = path.join(DATA_PATH, 'walkner-xiconf.json');
config.settings.defaults.password = '1@3';
config.settings.defaults.workflowFile = path.join(DATA_PATH, 'walkner-xiconf-workflow.xml');
config.settings.defaults.featurePath1 = '\\\\code1\\plrketchr8-box1\\Dokumentacja.technologiczna\\-=- Centrum dystrybucji\\Programowanie driverow\\1. Programy\\5. Multione';
config.settings.defaults.featurePath2 = 'C:\\Programy_Multione';
config.settings.defaults.programmerFile = path.join(
  process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'],
  'Philips MultiOne Workflow prototype latest\\MultiOneWorkflow.exe'
);
