'use strict';

exports.autoIt3Wrapper = 'C:/Program Files (x86)/AutoIt3/SciTE/AutoIt3Wrapper/AutoIt3Wrapper.exe';
exports.makensis = 'C:/Program Files (x86)/NSIS/makensis.exe';
exports.googleChromePortable = 'C:/Programs/GoogleChromePortable';
exports.node = 'C:/Program Files (x86)/nodejs/node.exe';
exports.nssm = 'C:/Programs/nssm/win32/nssm.exe';
exports.ntrights = 'C:/Program Files (x86)/Windows Resource Kits/Tools/ntrights.exe';
exports.vcredist_x86 = 'C:/Programs/vcredist_x86.exe';
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
