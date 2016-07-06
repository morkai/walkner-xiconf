// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var BufferQueueReader = require('h5.buffers').BufferQueueReader;
var commands = require('./commands');

module.exports = Master;

function Master(options)
{
  EventEmitter.call(this);

  this.onSerialPortData = this.onSerialPortData.bind(this);

  this.serialPort = options.serialPort;
  this.serialPort.on('data', this.onSerialPortData);

  this.address = options.address || 0x00;

  this.rxBuffer = new BufferQueueReader();

  this.commandQueue = [];

  this.currentCommand = null;

  this.timeoutDelay = options.timeout || 200;

  this.timeoutTimer = null;
}

util.inherits(Master, EventEmitter);

Master.prototype.destroy = function()
{
  clearTimeout(this.timeoutTimer);

  this.serialPort.removeListener('data', this.onSerialPortData);
  this.serialPort = null;
  this.commandQueue = [];
  this.currentCommand = null;
  this.timeoutTimer = null;
};

Master.prototype.execute = function(command, callback)
{
  command.callback = callback;

  this.commandQueue.push(command);
  this.executeNextCommand();
};

Master.prototype.SESS = function(callback)
{
  this.execute(commands.SESS(this.address), callback);
};

Master.prototype.ENDS = function(callback)
{
  this.execute(commands.ENDS(this.address), callback);
};

Master.prototype.GCOM = function(callback)
{
  this.execute(commands.GCOM(this.address), callback);
};

Master.prototype.GMAX = function(callback)
{
  this.execute(commands.GMAX(this.address), callback);
};

Master.prototype.GOVP = function(callback)
{
  this.execute(commands.GOVP(this.address), callback);
};

Master.prototype.GETD = function(callback)
{
  this.execute(commands.GETD(this.address), callback);
};

Master.prototype.GETS = function(callback)
{
  this.execute(commands.GETS(this.address), callback);
};

Master.prototype.GETM = function(location, callback)
{
  this.execute(commands.GETM(this.address, location), callback);
};

Master.prototype.GETP = function(program, callback)
{
  this.execute(commands.GETP(this.address, program), callback);
};

Master.prototype.GPAL = function(callback)
{
  this.execute(commands.GPAL(this.address), callback);
};

Master.prototype.VOLT = function(voltage, callback)
{
  this.execute(commands.VOLT(this.address, voltage), callback);
};

Master.prototype.CURR = function(current, callback)
{
  this.execute(commands.CURR(this.address, current), callback);
};

Master.prototype.SOVP = function(voltage, callback)
{
  this.execute(commands.SOVP(this.address, voltage), callback);
};

Master.prototype.SOUT = function(state, callback)
{
  this.execute(commands.SOUT(this.address, state), callback);
};

Master.prototype.POWW = function(location, state, callback)
{
  this.execute(commands.POWW(this.address, location, state), callback);
};

Master.prototype.PROM = function(location, voltage, current, callback)
{
  this.execute(commands.PROM(this.address, location, voltage, current), callback);
};

Master.prototype.PROP = function(location, voltage, current, minute, second, callback)
{
  this.execute(commands.PROP(this.address, location, voltage, current, minute, second), callback);
};

Master.prototype.RUNM = function(location, callback)
{
  this.execute(commands.RUNM(this.address, location), callback);
};

Master.prototype.RUNP = function(times, callback)
{
  this.execute(commands.RUNP(this.address, times), callback);
};

Master.prototype.STOP = function(callback)
{
  this.execute(commands.STOP(this.address), callback);
};

/**
 * @private
 */
Master.prototype.executeNextCommand = function()
{
  if (this.currentCommand !== null || this.commandQueue.length === 0)
  {
    return;
  }

  this.currentCommand = this.commandQueue.shift();

  this.setUpRequestTimeout();
  this.sendRequest();
};

/**
 * @private
 */
Master.prototype.setUpRequestTimeout = function()
{
  this.timeoutTimer = setTimeout(onRequestTimeout, this.timeoutDelay, this);

  function onRequestTimeout(that)
  {
    var currentCommand = that.currentCommand;

    if (!currentCommand)
    {
      return;
    }

    that.currentCommand = null;
    that.timeoutTimer = null;

    if (typeof currentCommand.callback === 'function')
    {
      currentCommand.callback(new Error('SDP_TIMEOUT'));
    }

    that.executeNextCommand();
  }
};

/**
 * @private
 */
Master.prototype.sendRequest = function()
{
  if (this.rxBuffer.length)
  {
    this.rxBuffer.skip(this.rxBuffer.length);
  }

  this.emit('tx', this.currentCommand.request);

  this.serialPort.write(this.currentCommand.request);
};

/**
 * @private
 */
Master.prototype.onSerialPortData = function(data)
{
  if (!this.currentCommand)
  {
    return;
  }

  this.rxBuffer.push(data);

  if (this.rxBuffer.length === this.currentCommand.responseLength)
  {
    this.handleResponse();
  }
};

/**
 * @private
 */
Master.prototype.handleResponse = function()
{
  clearTimeout(this.timeoutTimer);
  this.timeoutTimer = null;

  var currentCommand = this.currentCommand;
  var resBuffer = this.rxBuffer.shiftBuffer(this.currentCommand.responseLength);

  this.emit('rx', resBuffer);

  var res = currentCommand.response(resBuffer);

  this.currentCommand = null;

  if (typeof currentCommand.callback === 'function')
  {
    if (res === null)
    {
      currentCommand.callback(new Error('SDP_INVALID_RESPONSE'), null);
    }
    else
    {
      currentCommand.callback(null, res);
    }
  }

  this.executeNextCommand();
};
