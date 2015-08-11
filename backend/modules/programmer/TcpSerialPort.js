// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var Socket = require('net').Socket;

module.exports = TcpSerialPort;

/**
 * @constructor
 * @extends {EventEmitter}
 * @param {string} host
 * @param {number} port
 */
function TcpSerialPort(host, port)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type {string}
   */
  this.host = host;

  /**
   * @private
   * @type {number}
   */
  this.port = port;

  /**
   * @private
   * @type {Socket|null}
   */
  this.socket = null;
}

inherits(TcpSerialPort, EventEmitter);

TcpSerialPort.prototype.destroy = function()
{
  if (this.socket)
  {
    this.socket.removeAllListeners();
    this.socket.on('error', _.noop);
    this.socket.destroy();
    this.socket = null;
  }
};

/**
 * @param {function((Error|null))} done
 */
TcpSerialPort.prototype.open = function(done)
{
  if (this.socket)
  {
    return setImmediate(done);
  }

  var finalize = _.once(done);
  var tcpSerialPort = this;
  var socket = new Socket();

  socket.once('connect', function()
  {
    tcpSerialPort.socket = socket;

    tcpSerialPort.emit('connect');

    finalize();
  });

  socket.once('close', function()
  {
    if (tcpSerialPort.socket)
    {
      tcpSerialPort.socket.removeAllListeners();
    }

    tcpSerialPort.socket = null;

    tcpSerialPort.emit('close');

    finalize();
  });

  socket.on('error', function(err)
  {
    if (tcpSerialPort.socket)
    {
      tcpSerialPort.socket.removeAllListeners();
    }

    tcpSerialPort.socket = null;

    tcpSerialPort.emit('error', err);

    finalize();
  });

  socket.on('data', this.emit.bind(this, 'data'));

  socket.connect(this.port, this.host);
};

/**
 * @param {Buffer} buffer
 */
TcpSerialPort.prototype.write = function(buffer)
{
  if (this.socket)
  {
    this.socket.write(buffer);
  }
};
