/*jshint maxlen:false*/

'use strict';

var path = require('path');

var BIN_PATH = path.join(__dirname, '..', 'bin');
var DATA_PATH = path.join(__dirname, '..', 'data');

var config = module.exports = require(path.join(__dirname, 'walkner-xiconf.js'));

config.sqlite3.dbFile = path.join(DATA_PATH, 'db.leds.sqlite3');

config.programmer.workflowFile = path.join(DATA_PATH, 'workflow.leds.txt');
config.programmer.lastModeFile = path.join(DATA_PATH, 'lastMode.leds.txt');

config.history.lastExportTimeFile = path.join(DATA_PATH, 'lastExportAt.leds.txt');

config.settings.settingsFile = path.join(DATA_PATH, 'settings.leds.json');
