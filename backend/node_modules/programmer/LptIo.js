// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var format = require('util').format;
var spawn = require('child_process').spawn;

module.exports = LptIo;

function LptIo(options)
{
  this.options = options;
  this.startTimer = null;
  this.readTimer = null;
  this.process = null;
  this.buffer = '';
  this.finished = null;

  this.setUpProcess();
}

LptIo.prototype.cancel = function()
{
  this.done(true, 'CANCELLED');
};

LptIo.prototype.start = function()
{
  if (this.process === null)
  {
    throw new Error('Already done!');
  }

  this.startTimer = setTimeout(this.done.bind(this, true, 'LPT_START_TIMEOUT'), this.options.startTimeout);
  this.readTimer = setInterval(this.read.bind(this), this.options.readInterval || 100);

  this.write(0);
  this.read();
};

LptIo.prototype.finish = function(state)
{
  if (this.finished === null)
  {
    this.finished = state ? 1 : 0;

    this.write(this.finished);

    setTimeout(this.done.bind(this, true, null), 1337);
  }
};

/**
 * @private
 * @param {boolean} killProcess
 * @param {Error|string|null} err
 */
LptIo.prototype.done = function(killProcess, err)
{
  this.buffer = '';

  if (killProcess && this.process)
  {
    this.process.removeAllListeners();
    this.process.kill();
    this.process = null;
  }

  if (this.startTimer)
  {
    clearTimeout(this.startTimer);
    this.startTimer = null;
  }

  if (this.readTimer)
  {
    clearInterval(this.readTimer);
    this.readTimer = null;
  }

  if (this.options.done)
  {
    this.options.done(err);
    this.options.done = null;
  }
};

/**
 * @private
 */
LptIo.prototype.setUpProcess = function()
{
  var lptIo = this;

  this.process = spawn(this.options.lptIoFile);

  this.process.on('error', function(err)
  {
    err.code = 'LPT_FILE_ERROR';

    lptIo.done(true, err);
  });

  this.process.stdout.setEncoding('utf8');
  this.process.stdout.on('data', function(chunk)
  {
    lptIo.buffer += chunk;

    lptIo.handleBuffer();
  });
};

/**
 * @private
 */
LptIo.prototype.handleBuffer = function()
{
  var eolPos = this.buffer.indexOf('\r\n');

  if (eolPos === -1)
  {
    return;
  }

  var line = this.buffer.substr(0, eolPos);
  var args = line.split(' ');

  this.buffer = this.buffer.substr(eolPos + 2);

  if (args[0] === 'READ' && args.length === 5)
  {
    var trueValue = this.options.readInverted ? '0' : '1';

    if (args[4] === trueValue)
    {
      this.done(false, null);
    }
  }
  else if (args[0] === 'WRITE' && args.length === 5 && Number(args[3]) === this.finished)
  {
    this.done(true, null);
  }

  this.handleBuffer();
};

/**
 * @private
 */
LptIo.prototype.read = function()
{
  if (this.process)
  {
    this.process.stdin.write(format('READ %d %d\r\n', this.options.readPort, this.options.readBit));
  }
};

/**
 * @private
 * @param {number} value
 */
LptIo.prototype.write = function(value)
{
  if (this.process)
  {
    this.process.stdin.write(format('WRITE %d %d %d\r\n', this.options.writePort, this.options.writeBit, value));
  }
};
