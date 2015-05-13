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
  'sio',
  'updater'
];

exports.sqlite3 = {
  dbFile: DATA_PATH + '/db.sqlite3'
};

exports.programmer = {
  featureDbPath: DATA_PATH + '/features',
  workflowFile: DATA_PATH + '/workflow.txt',
  lptIoFile: BIN_PATH + '/LptIo/LptIo.exe',
  lastModeFile: DATA_PATH + '/lastMode.txt',
  spoolFile: BIN_PATH + '/spool.exe',
  motoBarScanFile: BIN_PATH + '/MotoBarScan/MotoBarScan.exe'
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
    id: '',
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
    searchTimeout1: 10000,
    searchTimeout2: 5000,
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
    solResetDelay: 2000,
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
    prodLine: '',
    serviceTagPrint: 1,
    serviceTagPrinter: 'ServiceTagPrinterZPL',
    serviceTagLabelType: 'zpl',
    serviceTagLabelCode: '',
    serviceTagInLocalMode: 'optional',
    protectInputMode: 1,
    bgScanner: 0,
    bgScannerBeepBad: -1,
    bgScannerBeepGood: -1,
    ledsEnabled: 0,
    programming: 1,
    hotkeys: {
      focusOrderNo: 'Q',
      focusQuantity: 'W',
      focusNc12: 'E',
      focusLog: 'R',
      focusHistory: 'T',
      toggleInputMode: 'A',
      toggleWorkMode: 'S',
      reset: 'D',
      reload: 'F',
      setProgram: 'G',
      printServiceTag: 'H',
      start: 'P',
      cancel: 'P',
      continue: 'L',
      showDashboardPage: 'Z',
      showHistoryPage: 'X',
      showProgramsPage: 'C',
      showSettingsPage: 'V',
      closeDialog: 'O'
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
    'programmer.finished',
    'programmer.barcodeScanned',
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

exports.updater = {

};
