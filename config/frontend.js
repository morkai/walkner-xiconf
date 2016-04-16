/*jshint maxlen:false*/

'use strict';

var fs = require('fs');

var DATA_PATH = __dirname + '/../data';
var BIN_PATH = __dirname + '/../bin';

exports.id = 'walkner-xiconf';

exports.localSecretKey = null;

exports.modules = [
  'safeFs',
  'sqlite3',
  'settings',
  'history',
  'xiconfPrograms',
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

exports.httpServer = {
  host: '0.0.0.0',
  port: 1337
};

exports.programmer = {
  featureDbPath: DATA_PATH + '/features',
  gprsOutputFile: DATA_PATH + '/gprs-output.xml',
  workflowFile: DATA_PATH + '/workflow.txt',
  lptIoFile: BIN_PATH + '/LptIo/LptIo.exe',
  lastModeFile: DATA_PATH + '/lastMode.txt',
  spoolFile: BIN_PATH + '/spool.exe',
  motoBarScanFile: BIN_PATH + '/MotoBarScan/MotoBarScan.exe',
  fakeFeatureFile: BIN_PATH + '/fake-feature.xml',
  httpPort: exports.httpServer.port
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
    workflowDaliFactoryNew: 0,
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
    mowLabelDataLocationEnabled: 0,
    mowLabelDataLocation: '',
    mowUniqueId: '',
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
    testingComPattern: 'COM1',
    testingComAddress: 0x00,
    testingComTimeout: 500,
    testingMaxVoltage: 24,
    testingCurrent: 10,
    testingModbusEnabled: 0,
    testingModbusHost: '127.0.0.1',
    testingModbusPort: 502,
    glp2Enabled: 0,
    glp2AllInOne: 0,
    glp2ComPattern: 'COM1',
    glp2ComAddress: 0x01,
    glp2ProgrammingDelay: 2000,
    glp2CancelDelay: 2000,
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
    bgScannerBeepDone: -1,
    bgScannerFilter: '',
    ledsEnabled: 0,
    ledsCheckingMode: 'pass',
    programming: 1,
    forceLatestOrder: 0,
    gprsVerification: 1,
    gprsVerificationTimeout: 60000,
    gprsVerificationInputPath: DATA_PATH + '/gprs/input',
    gprsVerificationSuccessPath: DATA_PATH + '/gprs/success',
    gprsVerificationErrorPath: DATA_PATH + '/gprs/error',
    gprsOrdersPath: DATA_PATH + '/gprs/orders',
    gprsProgrammerFile: 'CityTouchIPT.exe',
    gprsInputTemplateFile: DATA_PATH + '/gprs-input.json',
    gprsDaliPort: 0,
    flResource1: '',
    flResource2: '',
    ftEnabled: false,
    ftDuration: 2000,
    ftMaxVoltage: 24,
    ftMaxResistance: 1,
    ftSetCurrent: 10,
    ftSetVoltage: 10,
    ftStartResource1: '',
    ftStartResource2: '',
    ftSerialProxyAddress: '',
    ftOrderPattern: '',
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

exports.pubsub = {
  statsPublishInterval: 10000,
  republishTopics: [
    'featureSync.*',
    'settings.changed',
    'programmer.finished',
    'programmer.barcodeScanned',
    'programmer.startRequested',
    'programmer.resultToggled',
    'history.orderUpdated',
    'xiconfPrograms.*'
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
  title: exports.id,
  routes: require('../backend/routes')
};

exports.updater = {

};
