'use strict';

var fs = require('fs');
var path = require('path');

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

exports.libeay32 = null;

['C:/OpenSSL-Win64/libeay32.dll', path.join(process.env.SYSTEMROOT, 'System32', 'libeay32.dll')].forEach(function(path)
{
  if (exports.libeay32 === null && fs.existsSync(path))
  {
    exports.libeay32 = path;
  }
});

if (exports.libeay32 === null)
{
  throw new Error("Path to the `libeay32.dll` file is required!");
}

try
{
  var custom = require('./installer.json');

  Object.keys(custom).forEach(function(key)
  {
    exports[key] = custom[key];
  });
}
catch (err) {}
