/*jshint maxlen:false*/

'use strict';

var path = require('path');

var BIN_PATH = path.join(__dirname, '..', 'bin');
var DATA_PATH = path.join(__dirname, '..', 'data');

var _ = require(path.join(BIN_PATH, 'walkner-xiconf/node_modules/lodash'));

var config = module.exports = require(path.join(BIN_PATH, 'walkner-xiconf/config/frontend.js'));

_.assign(config, {
  localSecretKey: null
});

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
  orders: 'required',
  remoteServer: 'http://161.87.64.46:6080/',
  syncInterval: 2,
  workflowVerify: 1,
  featurePath1: '\\\\code1\\plrketchr8-box1\\Dokumentacja.technologiczna\\-=- Centrum dystrybucji\\Programowanie driverow\\1. Programy\\5. Multione',
  featurePath2: 'C:\\Programy_Multione',
  searchTimeout1: 15000,
  searchTimeout2: 15000,
  continueOnWarnings: 'halt',
  cancelDelay: 2000,
  programmerFile: path.join(
    process.env['ProgramFiles(x86)'] || process.env.ProgramFiles,
    'Philips MultiOne Workflow\\MultiOneWorkflow.exe'
  ),
  solReset: 0,
  imWorkin: 1,
  testingComPattern: 'COM2',
  serviceTagPrint: 0,
  serviceTagLabelCode: '<DLE>CT~~CD,~CC^~CT~\n^XA~TA000~JSN^LT0^MNW^MTT^PON^PMN^LH0,0^JMA^PR3,3~SD30^JUS^LRN^CI0^XZ\n^XA\n^MMT\n^PW400\n^LL0240\n^LS0\n^BY2,3,129^FT33,162^BCN,,N,N\n^FD>:P>50000000000000000>60^FS\n^FT92,216^A0N,34,48^FH\\^FDServiceTag^FS\n^FT127,30^A0N,16,16^FB145,1,0,C^FH\\^FDP00000000000000000^FS\n^PQ1,0,1,Y^XZ',
  bgScanner: 1,
  bgScannerBeepBad: 14,
  bgScannerBeepGood: 1,
  bgScannerBeepDone: 20,
  gprsVerificationTimeout: 120000,
  gprsVerificationInputPath: '\\\\code1\\plrketchr8-box1\\GPRS\\Input',
  gprsVerificationSuccessPath: '\\\\code1\\plrketchr8-box1\\GPRS\\Success',
  gprsVerificationErrorPath: '\\\\code1\\plrketchr8-box1\\GPRS\\Error',
  gprsOrdersPath: '\\\\code1\\plrketchr8-box1\\Etykiety\\Input',
  gprsProgrammerFile: 'C:\\ICP\\CityTouchIPT.exe',
  gprsInputTemplateFile: path.join(DATA_PATH, '/gprs-input.json')
});

_.assign(config.settings.defaults.hotkeys, {
  continue: 'P',
  cancel: null
});
