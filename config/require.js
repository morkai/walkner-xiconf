'use strict';

exports.paths = {
  'text': 'vendor/require/text',
  'i18n': 'vendor/require/i18n',
  'domReady': 'vendor/require/domReady',
  'underscore': 'vendor/underscore',
  'jquery': 'vendor/jquery',
  'backbone': 'vendor/backbone',
  'backbone.layout': 'vendor/backbone.layoutmanager',
  'moment': 'vendor/moment/moment',
  'moment-lang': 'vendor/moment/lang',
  'moment-timezone': 'vendor/moment/moment-timezone',
  'bootstrap': 'vendor/bootstrap/js/bootstrap',
  'socket.io': 'vendor/socket.io',
  'h5.pubsub': 'vendor/h5.pubsub',
  'h5.rql': 'vendor/h5.rql',
  'jquery.flipster': 'vendor/flipster/jquery.flipster',
  'form2js': 'vendor/form2js',
  'js2form': 'vendor/js2form',
  'highlight': 'vendor/highlight/highlight.pack',
  'highcharts': 'vendor/highcharts-custom'
};

exports.shim = {
  'underscore': {
    exports: '_'
  },
  'backbone': {
    deps: ['underscore', 'jquery'],
    exports: 'Backbone'
  },
  'bootstrap': ['jquery'],
  'jquery.flipster': ['jquery'],
  'highlight': {
    exports: 'hljs'
  },
  'highcharts': {
    deps: ['jquery'],
    exports: 'Highcharts'
  }
};

exports.buildPaths = exports.paths;
exports.buildShim = exports.shim;
