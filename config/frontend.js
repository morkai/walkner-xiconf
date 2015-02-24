/*jshint maxlen:false*/

'use strict';

var fs = require('fs');

var DATA_PATH = __dirname + '/../data';
var BIN_PATH = __dirname + '/../bin';

exports.id = 'walkner-xiconf';

exports.modules = [
  'sqlite3',
  'settings',
  'history',
  'programs',
  'programmer',
  'featureSync',
  'imWorkin',
  'pubsub',
  'express',
  'httpServer',
  'sio'
];

exports.sqlite3 = {
  dbFile: DATA_PATH + '/db.sqlite3'
};

exports.programmer = {
  featureDbPath: DATA_PATH + '/features',
  workflowFile: DATA_PATH + '/workflow.txt',
  lptIoFile: BIN_PATH + '/LptIo/LptIo.exe',
  lastModeFile: DATA_PATH + '/lastMode.txt'
};

exports.history = {
  featureDbPath: exports.programmer.featureDbPath,
  lastExportTimeFile: DATA_PATH + '/lastExportAt.txt'
};

exports.settings = {
  settingsFile: DATA_PATH + '/settings.json',
  licenseEdPem: fs.existsSync(__dirname + '/license.ed.public.pem')
    ? fs.readFileSync(__dirname + '/license.ed.public.pem', 'utf8')
    : null,
  defaults: {
    password: 'x!c0nf',
    id: process.env.COMPUTERNAME || exports.id,
    licenseKey: '',
    licenseInfo: {
      appId: null,
      appVersion: null,
      date: '0000-00-00',
      uuid: '00000000-0000-0000-0000-000000000000',
      features: 0,
      error: 'NO_KEY'
    },
    title: '',
    orders: 'disabled',
    remoteServer: '',
    syncInterval: 30,
    workflowVerify: 0,
    workflowIdentifyAlways: 0,
    workflowMultiDevice: 0,
    workflowCheckDeviceModel: 0,
    workflowCommissionAll: 0,
    featurePath1: DATA_PATH + '/_features1',
    featurePath2: DATA_PATH + '/_features2',
    searchTimeout1: 5000,
    searchTimeout2: 2500,
    readTimeout1: 5000,
    readTimeout2: 2500,
    schedulerEnabled: 0,
    schedulerFile: '',
    supportedDevicesEnabled: 0,
    supportedDevicesFile: '',
    interface: 'd',
    logVerbosity: 'info',
    continueOnWarnings: 'continue',
    backupPath: 1,
    backupDelay: 15,
    cancelDelay: 0,
    programDelay: 0,
    blockageDuration: 0,
    blockageInterval: 0,
    programmerFile: 'C:/Program Files (x86)/Philips MultiOne Workflow/MultiOneWorkflow.exe',
    solComPattern: 'FTDI',
    solFilePattern: 'SOL',
    solReset: 1,
    lptEnabled: 0,
    lptStartTimeout: 30000,
    lptFilePattern: '',
    lptReadPort: 0x378,
    lptReadBit: 15,
    lptReadInverted: 0,
    lptWritePort: 0x378,
    lptWriteBit: 5,
    imWorkin: 0,
    testingEnabled: 0,
    testingComPattern: 'COM2',
    testingComAddress: 0x00,
    testingComTimeout: 500,
    testingMaxVoltage: 24,
    testingCurrent: 10,
    testingModbusEnabled: false,
    testingModbusHost: '127.0.0.1',
    testingModbusPort: 502,
    hotkeys: {
      focusOrderNo: 'Q',
      focusQuantity: 'W',
      focusNc12: 'E',
      focusLog: 'R',
      focusHistory: 'T',
      toggleMode: 'A',
      resetOrder: 'S',
      repeatOrder: 'D',
      switchMode: 'F',
      program: 'Space',
      cancel: 'Space',
      pickProgram: 'G',
      showDashboardPage: 'Z',
      showHistoryPage: 'X',
      showSettingsPage: 'C',
      showProgramsPage: 'V'
    }
  }
};

exports.httpServer = {
  host: '0.0.0.0',
  port: 1337
};

exports.pubsub = {
  statsPublishInterval: 10000,
  republishTopics: [
    'featureSync.*',
    'settings.changed',
    'programmer.stateChanged',
    'programmer.stepProgressed',
    'programmer.logged',
    'programmer.finished',
    'history.orderUpdated',
    'programs.*'
  ]
};

exports.express = {
  mongooseId: null,
  staticPath: __dirname + '/../frontend',
  staticBuildPath: __dirname + '/../frontend-build',
  cookieSecret: null,
  ejsAmdHelpers: {
    t: 'app/i18n'
  },
  title: exports.id
};
