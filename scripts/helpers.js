/*jshint maxlen:false*/

'use strict';

var path = require('path');
var pkg = require('../package.json');
var installerConfig = require('./../config/installer');

var DEST_INSTALLER = path.join(__dirname, '../build/installer');
var DEST_SCRIPTS = path.join(__dirname, '../build/scripts');
var DEST_APP = DEST_INSTALLER + '/bin/walkner-xiconf';

exports.copy = {
  scripts: {
    expand: true,
    cwd: './scripts',
    src: [
      'common.au3',
      'run.au3',
      'run.ico',
      'uninstall.au3',
      'uninstall.ico'
    ],
    dest: DEST_SCRIPTS
  },
  installer: {
    files: [
      {
        expand: true,
        cwd: './backend',
        src: '**',
        dest: DEST_APP + '/backend'
      },
      {
        expand: true,
        cwd: './config',
        src: ['frontend.js', 'require.js', 'license.ed.public.pem'],
        dest: DEST_APP + '/config'
      },
      {
        expand: true,
        cwd: './frontend-build',
        src: ['**/*.png'],
        dest: DEST_APP + '/frontend-build'
      },
      {
        expand: true,
        cwd: './frontend-build',
        src: [
          'main.js',
          'favicon.ico',
          'assets/main.css',
          'vendor/font-awesome/fonts/fontawesome-webfont.woff',
          'vendor/require/require.js'
        ],
        dest: DEST_APP + '/frontend-build'
      },
      {
        expand: true,
        cwd: './node_modules_prod',
        src: '**',
        dest: DEST_APP + '/node_modules'
      },
      {
        expand: true,
        cwd: './',
        src: ['history.md', 'license.md', 'package.json', 'readme.md', 'require-cache.json'],
        dest: DEST_APP
      },
      {
        src: './docs/install-guide.pl.pdf',
        dest: DEST_INSTALLER + '/docs/install-guide.pl.pdf'
      },
      {
        src: './docs/license.pl.pdf',
        dest: DEST_INSTALLER + '/docs/license.pl.pdf'
      },
      {
        src: './docs/user-guide.pl.pdf',
        dest: DEST_INSTALLER + '/docs/user-guide.pl.pdf'
      },
      {
        src: './data/.keep',
        dest: DEST_INSTALLER + '/data/features/.keep'
      },
      {
        src: './data/workflow.txt',
        dest: DEST_INSTALLER + '/data/workflow.txt'
      },
      {
        src: './data/.keep',
        dest: DEST_INSTALLER + '/logs/.keep'
      },
      {
        src: './data/config.js',
        dest: DEST_INSTALLER + '/config/walkner-xiconf.js'
      },
      {
        src: './data/config.leds.js',
        dest: DEST_INSTALLER + '/config/walkner-xiconf.leds.js'
      },
      {
        src: './data/gprs-input.json',
        dest: DEST_INSTALLER + '/data/gprs-input.json'
      },
      {
        src: installerConfig.node,
        dest: DEST_INSTALLER + '/bin/node.exe'
      },
      {
        src: installerConfig.imWorkin,
        dest: DEST_APP + '/bin/ImWorkin.exe'
      },
      {
        src: path.join(installerConfig.lptIo, 'LptIo.exe'),
        dest: DEST_APP + '/bin/LptIo/LptIo.exe'
      },
      {
        src: path.join(installerConfig.lptIo, 'inpout32.dll'),
        dest: DEST_APP + '/bin/LptIo/inpout32.dll'
      },
      {
        src: path.join(installerConfig.lptIo, 'inpoutx64.dll'),
        dest: DEST_APP + '/bin/LptIo/inpoutx64.dll'
      },
      {
        src: installerConfig.spool,
        dest: DEST_APP + '/bin/spool.exe'
      },
      {
        src: path.join(installerConfig.motoBarScan, 'MotoBarScan.exe'),
        dest: DEST_APP + '/bin/MotoBarScan/MotoBarScan.exe'
      },
      {
        src: path.join(installerConfig.motoBarScan, 'MotoBarScan.exe.config'),
        dest: DEST_APP + '/bin/MotoBarScan/MotoBarScan.exe.config'
      },
      {
        src: path.join(installerConfig.motoBarScan, 'Interop.CoreScanner.dll'),
        dest: DEST_APP + '/bin/MotoBarScan/Interop.CoreScanner.dll'
      },
      {
        src: installerConfig.libeay32,
        dest: DEST_APP + '/node_modules/ursa/lib/libeay32.dll'
      },
      {
        src: installerConfig.unzip,
        dest: DEST_INSTALLER + '/bin/unzip.exe'
      },
      {
        src: installerConfig.stdRedir,
        dest: DEST_INSTALLER + '/bin/XiconfStdRedir.exe'
      },
      {
        src: DEST_SCRIPTS + '/XiconfRun.exe',
        dest: DEST_INSTALLER + '/bin/XiconfRun.exe'
      },
      {
        src: DEST_SCRIPTS + '/XiconfUninstall.exe',
        dest: DEST_INSTALLER + '/bin/XiconfUninstall.exe'
      }
    ]
  }
};

exports.run = {
  run: {
    cmd: installerConfig.autoIt3Wrapper,
    args: [
      '/in', DEST_SCRIPTS + '/run.au3',
      '/pack',
      '/x86',
      '/NoStatus'
    ],
    options: {
      cwd: DEST_SCRIPTS
    }
  },
  uninstall: {
    cmd: installerConfig.autoIt3Wrapper,
    args: [
      '/in', DEST_SCRIPTS + '/uninstall.au3',
      '/pack',
      '/x86',
      '/NoStatus'
    ],
    options: {
      cwd: DEST_SCRIPTS
    }
  },
  install: {
    exec: '"' + installerConfig.makensis + '" ' + [
      '/INPUTCHARSET', 'UTF8',
      '/OUTPUTCHARSET', 'UTF8',
      '/DPRODUCT_GUID="' + pkg.guid + '"',
      '/DPRODUCT_VERSION="' + pkg.version + '"',
      '"' + __dirname + '/install.nsi"'
    ].join(' '),
    options: {
      cwd: __dirname
    }
  }
};

exports.replace = {
  scripts: {
    src: [
      DEST_SCRIPTS + '/common.au3',
      DEST_SCRIPTS + '/run.au3',
      DEST_SCRIPTS + '/uninstall.au3'
    ],
    overwrite: true,
    replacements: [
      {
        from: '$PRODUCT_GUID = "00000000-0000-0000-0000-000000000000"',
        to: '$PRODUCT_GUID = "' + pkg.guid + '"'
      },
      {
        from: '$PRODUCT_VERSION = "0.0.0"',
        to: '$PRODUCT_VERSION = "' + pkg.version + '"'
      },
      {
        from :'#AutoIt3Wrapper_Res_ProductVersion=0.0.0',
        to: '#AutoIt3Wrapper_Res_ProductVersion=' + pkg.version
      },
      {
        from: '$SERVER_PORT = 1337',
        to: '$SERVER_PORT = ' + installerConfig.serverPort
      }
    ]
  }
};
