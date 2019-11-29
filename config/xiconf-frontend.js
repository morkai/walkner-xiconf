'use strict';

var fs = require('fs');
var path = require('path');

var DATA_PATH = path.join(__dirname, '..', 'data');
var BIN_PATH = path.join(__dirname, '..', 'bin');

exports.id = 'walkner-xiconf';

exports.localSecretKey = null;

exports.modules = [
  'safeFs',
  {id: 'h5-sqlite3'},
  'settings',
  'history',
  'xiconfPrograms',
  'programmer',
  'featureSync',
  'imWorkin',
  'pubsub',
  {id: 'h5-express'},
  'httpServer',
  'sio',
  'updater'
];

exports['h5-sqlite3'] = {
  dbFile: path.join(DATA_PATH, 'db.sqlite3')
};

exports.httpServer = {
  host: '0.0.0.0',
  port: 1337
};

exports.programmer = {
  featureDbPath: path.join(DATA_PATH, 'features'),
  gprsOutputFile: path.join(DATA_PATH, 'gprs-output.xml'),
  workflowFile: path.join(DATA_PATH, 'workflow.txt'),
  lptIoFile: path.join(BIN_PATH, 'LptIo/LptIo.exe'),
  lastModeFile: path.join(DATA_PATH, 'lastMode.txt'),
  spoolFile: path.join(BIN_PATH, 'spool.exe'),
  motoBarScanFile: path.join(BIN_PATH, 'MotoBarScan/MotoBarScan.exe'),
  fakeFeatureFile: path.join(BIN_PATH, 'fake-feature.xml'),
  httpPort: exports.httpServer.port
};

exports.history = {
  featureDbPath: exports.programmer.featureDbPath,
  lastExportTimeFile: path.join(DATA_PATH, 'lastExportAt.txt')
};

exports.settings = {
  settingsFile: path.join(DATA_PATH, 'settings.json'),
  licenseEdPem: fs.existsSync(__dirname + '/license.ed.public.pem')
    ? fs.readFileSync(__dirname + '/license.ed.public.pem', 'utf8')
    : null,
  remoteServers: [],
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
    workflowCheckDevicePresent: 0,
    workflowCommissionAll: 0,
    workflowDaliFactoryNew: 0,
    featurePath1: path.join(DATA_PATH, '_features1'),
    featurePath2: path.join(DATA_PATH, '_features2'),
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
    gprsVerificationInputPath: path.join(DATA_PATH, 'gprs', 'input'),
    gprsVerificationSuccessPath: path.join(DATA_PATH, 'gprs', 'success'),
    gprsVerificationErrorPath: path.join(DATA_PATH, 'gprs', 'error'),
    gprsOrdersPath: path.join(DATA_PATH, 'gprs', 'orders'),
    gprsProgrammerFile: 'CityTouchIPT.exe',
    gprsInputTemplateFile: path.join(DATA_PATH, 'gprs-input.json'),
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
    hidEnabled: 0,
    weightEnabled: 0,
    weightHost: '',
    weightPort: 1001,
    weightStabilized: 1,
    weightTolerance: 0,
    weightCheckScope: 'none',
    weightRequireComponent: true,
    weightTimeout: 0,
    weightRefUnit: 1,
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

exports['h5-express'] = {
  mongooseId: null,
  staticPath: path.join(__dirname, '..', 'frontend'),
  staticBuildPath: path.join(__dirname, '..', 'frontend-build'),
  cookieSecret: null,
  ejsAmdHelpers: {
    t: 'app/i18n'
  },
  title: exports.id,
  routes: () =>
  {
    return [
      require('../backend/routes')
    ];
  }
};

exports.sio = {
  path: '/socket.io'
};

exports.updater = {

};
