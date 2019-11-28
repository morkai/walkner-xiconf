'use strict';

exports.autoIt3Wrapper = 'C:/Program Files (x86)/AutoIt3/SciTE/AutoIt3Wrapper/AutoIt3Wrapper.exe';
exports.makensis = 'C:/Program Files (x86)/NSIS/makensis.exe';
exports.node = 'C:/Program Files/nodejs/node.exe';
exports.imWorkin = 'C:/tools/ImWorkin.exe';
exports.lptIo = 'C:/tools/LptIo';
exports.spool = 'C:/tools/spool/spool.exe';
exports.motoBarScan = 'C:/tools/MotoBarScan';
exports.stdRedir = 'C:/tools/StdRedir.exe';
exports.unzip = 'C:/tools/unzip.exe';
exports.serverPort = 1337;

try
{
  var custom = require('./installer.json');

  Object.keys(custom).forEach(function(key)
  {
    exports[key] = custom[key];
  });
}
catch (err) {}
