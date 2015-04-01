'use strict';

var fs = require('fs');
var path = require('path');

exports.autoIt3Wrapper = 'C:/Program Files (x86)/AutoIt3/SciTE/AutoIt3Wrapper/AutoIt3Wrapper.exe';
exports.makensis = 'C:/Program Files (x86)/NSIS/makensis.exe';
exports.node = 'C:/Program Files (x86)/nodejs/node.exe';
exports.libeay32 = fs.existsSync(path.join(process.env.SYSTEMROOT, 'System32', 'libeay32.dll'))
  ? path.join(process.env.SYSTEMROOT, 'system32', 'libeay32.dll')
  : 'C:/tools/OpenSSL-Win32/libeay32.dll';
exports.imWorkin = 'C:/tools/ImWorkin.exe';
exports.lptIo = 'C:/tools/LptIo';
exports.spool = 'C:/tools/spool/spool.exe';
exports.motoBarScan = 'C:/tools/MotoBarScan';
exports.stdRedir = 'C:/tools/StdRedir.exe';
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
