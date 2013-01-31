var fs = require('fs');
var http = require('http');
var express = require('express');
var config = require('./config');

var LISTEN_PORT = 1337;
var LISTEN_ADDR = '127.0.0.1';
var DATA_PATH = __dirname + '/../data';

app = express();

app.log = function()
{
  var args = Array.prototype.slice.call(arguments);

  args.unshift("%s\t" + args[0]);
  args[1] = app.getDateTime(new Date());

  console.log.apply(console, args);
};

/**
 * Last 20 history entries.
 *
 * @type {Array.<object>}
 */
app.historyEntries = [];

/**
 * ID of the next history entry.
 *
 * Also an index of the line it is on in the data file.
 *
 * @type {number}
 */
app.nextHistoryEntryId = 0;

/**
 * @param {number} time
 * @return {string}
 */
app.getHistoryFileName = function(time)
{
  var date = new Date(time);
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();

  return DATA_PATH + '/'
    + year + '-'
    + (month < 10 ? '0' : '') + month + '-'
    + (day < 10 ? '0' : '') + day + '.txt';
};

/**
 * Name of the last history file name.
 *
 * Used to reset the next history entry ID when it changes.
 *
 * @type {string}
 */
app.lastHistoryFileName = app.getHistoryFileName(Date.now());

/**
 * Whether or now the programming is happening.
 *
 * @type {boolean}
 */
app.programming = false;

/**
 * @param {Date} date
 * @return {string}
 */
app.getDateTime = function(date)
{
  return date.getFullYear() + '-'
    + pad0(date.getMonth() + 1) + '-'
    + pad0(date.getDate()) + ' '
    + pad0(date.getHours()) + ':'
    + pad0(date.getMinutes()) + ':'
    + pad0(date.getSeconds()) + '.'
    + pad0(date.getMilliseconds(), 4);
};

fs.readFile(app.lastHistoryFileName, 'utf8', function(err, contents)
{
  if (!err)
  {
    var matches = contents.match(/\n/g);

    if (matches)
    {
      app.nextHistoryEntryId = matches.length;

      app.log("Set the next history entry ID to %d", app.nextHistoryEntryId);
    }
  }
});

http.createServer(app).listen(LISTEN_PORT, LISTEN_ADDR, function()
{
  app.log("HTTP server listening on %s:%d", LISTEN_ADDR, LISTEN_PORT);
});

app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(__dirname + '/../frontend'));

app.configure('development', function()
{
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.configure('production', function()
{
  app.use(express.errorHandler());
});

require('./routes');

/**
 * @private
 * @param {string} str
 * @param {number=2} length
 * @return {string}
 */
function pad0(str, length)
{
  str = str + '';
  length = length || 2;

  while (str.length < length)
  {
    str = '0' + str;
  }

  return str;
}
