/*jshint maxlen:false*/

'use strict';

var path = require('path');
var fs = require('fs');
var pkg = require('../package.json');
var installerConfig = require('./../config/installer');

var CHROME_VERSION = fs.readdirSync(path.join(installerConfig.googleChromePortable, 'App', 'Chrome-bin'))
  .filter(function(file) { return /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(file); })[0];
var DEST_INSTALLER = path.join(__dirname, '../build/installer');
var DEST_SCRIPTS = path.join(__dirname, '../build/scripts');
var DEST_APP = DEST_INSTALLER + '/bin/walkner-xiconf';
var DEST_CHROME = DEST_INSTALLER + '/bin/google-chrome';
var DEST_CHROME_BIN = DEST_CHROME + '/App/Chrome-bin/' + CHROME_VERSION;
var SRC_CHROME = installerConfig.googleChromePortable;
var SRC_CHROME_BIN = SRC_CHROME + '/App/Chrome-bin/' + CHROME_VERSION;

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
        cwd: './bin',
        src: ['service-create.bat', 'service-remove.bat'],
        dest: DEST_APP + '/bin'
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
          'vendor/require/require.js',
          'vendor/source-code-pro/SourceCodePro-Regular.otf'
        ],
        dest: DEST_APP + '/frontend-build'
      },
      {
        expand: true,
        cwd: './node_modules',
        src: '**',
        dest: DEST_APP + '/node_modules',
        filter: function(file)
        {
          var prefixLength = 'node_modules/'.length;
          var sepIndex = file.indexOf(path.sep, prefixLength);
          var moduleName = sepIndex === -1
            ? file.substr(prefixLength)
            : file.substring(prefixLength, sepIndex);

          return pkg.devDependencies[moduleName] === undefined;
        }
      },
      {
        expand: true,
        cwd: './',
        src: ['history.md', 'license.md', 'package.json', 'readme.md'],
        dest: DEST_APP
      },
      {
        src: './docs/install-guide.pl.pdf',
        dest: DEST_INSTALLER + '/docs/walkner-xiconf-install-guide.pl.pdf'
      },
      {
        src: './docs/license.pl.pdf',
        dest: DEST_INSTALLER + '/docs/walkner-xiconf-license.pl.pdf'
      },
      {
        src: './docs/user-guide.pl.pdf',
        dest: DEST_INSTALLER + '/docs/walkner-xiconf-user-guide.pl.pdf'
      },
      {
        src: './data/.keep',
        dest: DEST_INSTALLER + '/data/walkner-xiconf-features/.keep'
      },
      {
        src: './data/workflow.xml',
        dest: DEST_INSTALLER + '/data/walkner-xiconf-workflow.xml'
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
        expand: true,
        cwd: SRC_CHROME_BIN,
        src: ['**', '!default_apps/*.crx', '!Locales/*.pak', 'Locales/pl.pak', 'Locales/en-US.pak'],
        dest: DEST_CHROME_BIN
      },
      {
        src: './data/googleChromePortable/external_extensions.json',
        dest: DEST_CHROME_BIN + '/default_apps/external_extensions.json'
      },
      {
        expand: true,
        cwd: path.dirname(SRC_CHROME_BIN),
        src: '**',
        dest: path.dirname(DEST_CHROME_BIN),
        filter: 'isFile'
      },
      {
        expand: true,
        cwd: './data/googleChromePortable/DefaultData',
        src: '**',
        dest: DEST_CHROME + '/App/DefaultData'
      },
      {
        src: installerConfig.node,
        dest: DEST_INSTALLER + '/bin/node.exe'
      },
      {
        src: installerConfig.nssm,
        dest: DEST_INSTALLER + '/bin/nssm.exe'
      },
      {
        src: installerConfig.ntrights,
        dest: DEST_INSTALLER + '/bin/ntrights.exe'
      },
      {
        src: installerConfig.vcredist_x86,
        dest: DEST_INSTALLER + '/bin/vcredist_x86.exe'
      },
      {
        src: installerConfig.imWorkin,
        dest: DEST_APP + '/bin/ImWorkin.exe'
      },
      {
        src: installerConfig.libeay32,
        dest: DEST_APP + '/node_modules/ursa/bin/libeay32.dll'
      },
      {
        src: DEST_SCRIPTS + '/Walkner Xiconf.exe',
        dest: DEST_INSTALLER + '/Walkner Xiconf.exe'
      },
      {
        src: DEST_SCRIPTS + '/walkner-xiconf-uninstall.exe',
        dest: DEST_INSTALLER + '/bin/walkner-xiconf-uninstall.exe'
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
        from: '$SERVICE_USER = ""',
        to: '$SERVICE_USER = "' + installerConfig.serviceUser + '"'
      },
      {
        from: '$SERVICE_PASS = ""',
        to: '$SERVICE_PASS = "' + installerConfig.servicePass + '"'
      },
      {
        from: '$SERVER_PORT = 1337',
        to: '$SERVER_PORT = ' + installerConfig.serverPort
      }
    ]
  }
};
