'use strict';

var fs = require('fs');
var path = require('path');

exports.autoIt3Wrapper = 'C:/Program Files (x86)/AutoIt3/SciTE/AutoIt3Wrapper/AutoIt3Wrapper.exe';
exports.makensis = 'C:/Program Files (x86)/NSIS/makensis.exe';
exports.googleChromePortable = 'C:/tools/GoogleChromePortable';
exports.node = 'C:/Program Files (x86)/nodejs/node.exe';
exports.nssm = 'C:/tools/nssm/win32/nssm.exe';
exports.ntrights = 'C:/Program Files (x86)/Windows Resource Kits/Tools/ntrights.exe';
exports.vcredist_x86 = 'C:/tools/vcredist_x86.exe';
exports.libeay32 = fs.existsSync(path.join(process.env.SYSTEMROOT, 'System32', 'libeay32.dll'))
  ? path.join(process.env.SYSTEMROOT, 'system32', 'libeay32.dll')
  : 'C:/tools/OpenSSL-Win32/libeay32.dll';
exports.imWorkin = 'C:/tools/ImWorkin.exe';
exports.serviceUser = '';
exports.servicePass = '';
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
