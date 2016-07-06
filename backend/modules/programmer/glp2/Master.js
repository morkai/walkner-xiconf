// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');
var EventEmitter = require('events').EventEmitter;
var SerialPort = require('serialport');
var BufferQueueReader = require('h5.buffers').BufferQueueReader;
var NoConnectionError = require('./NoConnectionError');
var InvalidParametersError = require('./InvalidParametersError');
var ResponseTimeoutError = require('./ResponseTimeoutError');
var InvalidResponseError = require('./InvalidResponseError');
var InvalidChecksumError = require('./InvalidChecksumError');
var BusyTesterError = require('./BusyTesterError');
var PeTest = require('./PeTest');
var IsoTest = require('./IsoTest');
var FctTest = require('./FctTest');
var VisTest = require('./VisTest');
var ActualValuesResponse = require('./ActualValuesResponse');
var OrderDataDemandResponse = require('./OrderDataDemandResponse');
var InterimActualValuesResponse = require('./InterimActualValuesResponse');
var DeviceOptionsResponse = require('./DeviceOptionsResponse');
var constants = require('./constants');

module.exports = Master;

/**
 * @const
 * @type {string}
 */
var DEFAULT_COM_PORT = 'COM1';

/**
 * @const
 * @type {number}
 */
var DEFAULT_ADDRESS = 1;

/**
 * @const
 * @type {string}
 */
var DEFAULT_PROGRAM_NAME = 'TEST';

/**
 * @const
 * @type {number}
 */
var DEFAULT_RESPONSE_TIMEOUT = 1000;

/**
 * @const
 * @type {number}
 */
var DEFAULT_REQUEST_DELAY = 200;

/**
 * @type {object}
 */
var PARAMETERS = {
  /**
   * @type {TransmittingMode}
   */
  transmittingMode: [1, constants.TransmittingMode],
  /**
   * @type {GoSwitchAtVisualCheck}
   */
  goSwitchAtVisualCheck: [2, constants.GoSwitchAtVisualCheck],
  /**
   * @type {GoSwitchAtVisualCheck}
   */
  noGoSwitchAtVisualCheck: [3, constants.GoSwitchAtVisualCheck],
  /**
   * @type {OnOff}
   */
  peMultiTest: [4, constants.OnOff],
  /**
   * @type {PeDisplay}
   */
  peDisplay: [5, constants.PeDisplay],
  /**
   * @type {number}
   */
  repeatIfNoGo: [6, [0, 5]],
  /**
   * @type {PeSetValues}
   */
  peSetValues: [7, constants.PeSetValues],
  /**
   * @type {OnOff}
   */
  leaveOnFctAtThreePhaseDevice: [8, constants.OnOff],
  /**
   * @type {OnOff}
   */
  startProbe: [9, constants.OnOff],
  /**
   * @type {StartSafetySwitch}
   */
  startSafetySwitch: [10, constants.StartSafetySwitch],
  /**
   * @type {OnOff}
   */
  safetySwitch: [11, constants.OnOff],
  /**
   * @type {CnfFunction}
   */
  cntFunction: [12, constants.CnfFunction],
  /**
   * @type {OnOff}
   */
  completeDisplay: [13, constants.OnOff],
  /**
   * @type {OnOff}
   */
  noGoBuzzer: [14, constants.OnOff],
  /**
   * @type {OnOff}
   */
  currentWithoutPassword: [15, constants.OnOff],
  /**
   * @type {SelfTest}
   */
  selfTest: [16, constants.SelfTest],
  /**
   * @type {OnOff}
   */
  hvBuzzer: [17, constants.OnOff],
  /**
   * @type {OnOff}
   */
  hvFootSwitch: [18, constants.OnOff],
  /**
   * @type {HvProcess}
   */
  hvProcess: [19, constants.HvProcess],
  /**
   * @type {OnOff}
   */
  hvMultiTest: [20, constants.OnOff],
  /**
   * @type {number}
   */
  shortCircuitResistance: [21, [0, 100]],
  /**
   * @type {OnOff}
   */
  inputOfTwoTypes: [22, constants.OnOff],
  /**
   * @type {OnOff}
   */
  printProtocolNumber: [23, constants.OnOff],
  /**
   * @type {AddProtocolNumber}
   */
  addProtocolNumber: [24, constants.AddProtocolNumber],
  /**
   * @type {OnOff}
   */
  withInputOfSerialNumber: [25, constants.OnOff],
  /**
   * @type {OnOff}
   */
  storeSetValuesOnline: [26, constants.OnOff],
  /**
   * @type {OnOff}
   */
  combineSteps: [27, constants.OnOff],
  /**
   * @type {OnOff}
   */
  withHvGraphicsDisplay: [28, constants.OnOff],
  /**
   * @type {OnOff}
   */
  withBarcodeInput: [29, constants.OnOff],
  /**
   * @type {RemoteControl}
   */
  remoteControl: [30, constants.RemoteControl],
  /**
   * @type {OnOff}
   */
  indicateConnections: [31, constants.OnOff],
  /**
   * @type {OnOff}
   */
  enterNameOfOperator: [32, constants.OnOff],
  /**
   * @type {OnOff}
   */
  peBuzzer: [33, constants.OnOff],
  /**
   * @type {number}
   */
  fctUTolerance: [34, [0, 100]],
  /**
   * @type {OrderInputs}
   */
  orderInputs: [35, constants.OrderInputs],
  /**
   * @type {OnOff}
   */
  hvRelease: [36, constants.OnOff],
  /**
   * @type {TestStepDisplay}
   */
  testStepDisplay: [37, constants.TestStepDisplay],
  /**
   * @type {number}
   */
  sampleTime: [38, [250, 60000]],
  /**
   * @type {ActualValueData}
   */
  actualValueData: [39, constants.ActualValueData]
};

/**
 * @constructor
 * @param {object} [options]
 * @param {string} [options.comPort]
 * @param {number} [options.address]
 * @param {string} [options.defaultProgramName]
 * @param {number} [options.responseTimeout]
 * @param {number} [options.requestDelay]
 */
function Master(options)
{
  EventEmitter.call(this);

  if (typeof options !== 'object' || options === null)
  {
    options = {};
  }

  /**
   * @private
   * @type {string}
   */
  this.comPort = options.comPort || DEFAULT_COM_PORT;

  /**
   * @private
   * @type {number}
   */
  this.address = 128 + (options.address || DEFAULT_ADDRESS);

  /**
   * @private
   * @type {string}
   */
  this.defaultProgramName = options.defaultProgramName || DEFAULT_PROGRAM_NAME;

  /**
   * @private
   * @type {number}
   */
  this.responseTimeout = options.responseTimeout || DEFAULT_RESPONSE_TIMEOUT;

  /**
   * @private
   * @type {number}
   */
  this.requestDelay = options.requestDelay || DEFAULT_REQUEST_DELAY;

  /**
   * @private
   * @type {SerialPort|null}
   */
  this.serialPort = null;

  /**
   * @private
   * @type {BufferQueueReader}
   */
  this.incomingData = new BufferQueueReader();

  /**
   * @private
   * @type {number}
   */
  this.nextRequestId = 0;

  /**
   * @private
   * @type {object|null}
   */
  this.currentRequest = null;

  /**
   * @private
   * @type {Array.<object>}
   */
  this.requestQueue = [];

  /**
   * @private
   * @type {PARAMETERS}
   */
  this.currentParameters = {};

  /**
   * @private
   * @type {string}
   */
  this.currentParametersString = '';

  /**
   * @private
   * @type {number}
   */
  this.lastResponseAt = 0;

  /**
   * @private
   * @type {object|null}
   */
  this.sendRequestTimer = null;
}

util.inherits(Master, EventEmitter);

/**
 * @param {PARAMETERS} rawParams
 * @returns {PARAMETERS}
 * @throws {InvalidParametersError}
 */
Master.prepareParameters = function(rawParams)
{
  var paramNames = Object.keys(rawParams || {});

  if (paramNames.length === 0)
  {
    throw new InvalidParametersError("No parameters specified.");
  }

  var cleanParams = {};

  for (var i = 0; i < paramNames.length; ++i)
  {
    var paramName = paramNames[i];
    var param = PARAMETERS[paramName];

    if (!param)
    {
      throw new InvalidParametersError(util.format("Unknown parameter: `%s`.", paramName));
    }

    var rawValue = rawParams[paramName];
    var rawValueType = typeof rawValue;

    if (rawValueType !== 'number' && rawValueType !== 'string')
    {
      throw new InvalidParametersError(util.format(
        "Expected a value of type `number` or `string` for `%s`, but got `%s`.", paramName, rawValueType
      ));
    }

    var validator = param[1];
    var cleanValue;

    if (Array.isArray(validator))
    {
      cleanValue = Math.floor(rawValue);

      if (rawValue < validator[0] || rawValue > validator[1])
      {
        throw new InvalidParametersError(util.format(
          "`%s`s value is out of bounds: %s <= %s <= %s.", paramName, validator[0], rawValue, validator[1]
        ));
      }
    }
    else if (/^[0-9]+$/.test(rawValue))
    {
      var validatorKeys = Object.keys(validator);

      for (var ii = 0; ii < validatorKeys.length; ++ii)
      {
        if (validator[validatorKeys[ii]] === rawValue)
        {
          cleanValue = rawValue;

          break;
        }
      }
    }
    else
    {
      var valueLabel = rawValue.toUpperCase();

      if (validator[valueLabel] === undefined)
      {
        throw new InvalidParametersError(util.format("Unknown value for `%s`: `%s`.", paramName, rawValue));
      }

      cleanValue = validator[valueLabel];
    }

    if (cleanValue === undefined)
    {
      throw new InvalidParametersError(util.format("Invalid value for `%s`: `%s`.", paramName, rawValue));
    }

    cleanParams[param[0]] = cleanValue;
  }

  return cleanParams;
};

Master.prototype.open = function()
{
  if (this.serialPort !== null)
  {
    return;
  }

  this.serialPort = new SerialPort(this.comPort, {
    baudRate: 9600,
    parity: 'none',
    dataBits: 8,
    stopBits: 1,
    autoOpen: false
  });

  this.serialPort.on('open', this.emit.bind(this, 'open'));
  this.serialPort.on('error', this.emit.bind(this, 'error'));
  this.serialPort.on('data', this.onData.bind(this));
  this.serialPort.on('close', this.onClose.bind(this));

  this.serialPort.open();
};

Master.prototype.close = function()
{
  if (this.serialPort !== null)
  {
    this.serialPort.close();
  }
};

/**
 * @param {Buffer} requestBuffer
 * @param {function(): object|null} [responseHandler]
 * @param {function(Error|null, object|null)} done
 */
Master.prototype.send = function(requestBuffer, responseHandler, done)
{
  if (this.serialPort === null)
  {
    return done(new NoConnectionError(), null);
  }

  if (done === undefined)
  {
    done = responseHandler;
    responseHandler = this.handleResponseBuffer.bind(this);
  }

  this.requestQueue.push({
    requestId: ++this.nextRequestId,
    requestBuffer: requestBuffer,
    responseHandler: responseHandler,
    done: done,
    timer: null
  });

  this.sendNextRequest();
};

/**
 * @param {function(Error|null): void} done
 */
Master.prototype.getDeviceOptions = function(done)
{
  this.send(
    new Buffer([util.CHR.STX, this.address, util.CHR.OPT]),
    this.handleGetActualValuesResponse.bind(this),
    done
  );
};

/**
 * @param {function(Error|null): void} done
 */
Master.prototype.beep = function(done)
{
  this.sendDataString('b', done);
};

/**
 * @param {function(Error|null): void} done
 */
Master.prototype.removeCounters = function(done)
{
  this.sendDataString('h', done);
};

/**
 * @param {function(Error|null): void} done
 */
Master.prototype.startTest = function(done)
{
  this.sendDataString('s', done);
};

/**
 * @param {function(Error|null): void} done
 */
Master.prototype.cancelTest = function(done)
{
  this.sendDataString('&break', done);
};

/**
 * @param {boolean} evaluation
 * @param {function(Error|null): void} done
 */
Master.prototype.ackVisTest = function(evaluation, done)
{
  this.sendDataString(evaluation ? '&sprio' : '&sprnio', done);
};

/**
 * @param {PARAMETERS} params
 * @returns {boolean}
 */
Master.prototype.validateParameters = function(params)
{
  try
  {
    Master.prepareParameters(params);
  }
  catch (err)
  {
    return false;
  }

  return true;
};

/**
 * @param {PARAMETERS} params
 * @param {function(Error|null): void} done
 */
Master.prototype.setParameters = function(params, done)
{
  try
  {
    params = Master.prepareParameters(params);
  }
  catch (err)
  {
    return setImmediate(done, err);
  }

  var dataString = '';

  Object.keys(params).forEach(function(paramNo)
  {
    dataString += 'P' + paramNo + '_' + params[paramNo] + ' ';
  });

  this.currentParameters = params;
  this.currentParametersString = dataString;

  dataString += 'n';

  this.sendDataString(dataString, done);
};

/**
 * @param {function(Error|null, Response|null): void} done
 */
Master.prototype.getActualValues = function(done)
{
  var requestBuffer = new Buffer([util.CHR.STX, this.address, util.CHR.ACK]);
  var responseHandler = this.handleGetActualValuesResponse.bind(this);

  this.send(requestBuffer, responseHandler, done);
};

/**
 * @param {function(Error|null): void} done
 */
Master.prototype.removeTestResults = function(done)
{
  this.sendDataString('&clearres', done);
};

/**
 * @param {function(Error|null): void} done
 */
Master.prototype.removeTestPrograms = function(done)
{
  this.sendDataString('Q n', done);
};

/**
 * @param {string|null} programName
 * @param {Array.<ProgramStep>} steps
 * @param {function(Error|null): void} done
 */
Master.prototype.setTestProgram = function(programName, steps, done)
{
  var dataString = 'Q ' + this.currentParametersString
    + 'T_' + util.encodeStringValue(programName || this.defaultProgramName) + ' '
    + steps.map(function(step, i) { return step.toString(i + 1); }).join(' ')
    + 'n';

  this.sendDataString(dataString, done);
};

/**
 * @param {string|null} programName
 * @param {PeTest|object} options
 * @param {function(Error|null): void} done
 */
Master.prototype.setPeTestProgram = function(programName, options, done)
{
  this.setTestProgram(programName, [PeTest.fromObject(options)], done);
};

/**
 * @param {string|null} programName
 * @param {IsoTest|object} options
 * @param {function(Error|null): void} done
 */
Master.prototype.setIsoTestProgram = function(programName, options, done)
{
  this.setTestProgram(programName, [IsoTest.fromObject(options)], done);
};

/**
 * @param {string|null} programName
 * @param {FctTest|object} options
 * @param {function(Error|null): void} done
 */
Master.prototype.setFctTestProgram = function(programName, options, done)
{
  this.setTestProgram(programName, [FctTest.fromObject(options)], done);
};

/**
 * @param {string|null} programName
 * @param {VisTest|object} options
 * @param {function(Error|null): void} done
 */
Master.prototype.setVisTestProgram = function(programName, options, done)
{
  this.setTestProgram(programName, [VisTest.fromObject(options)], done);
};

/**
 * @private
 * @param {string} dataString
 * @param {function(Error|null, object|null): void} done
 */
Master.prototype.sendDataString = function(dataString, done)
{
  this.send(this.frameDataString(dataString), this.handleSendDataResponse.bind(this), done);
};

/**
 * @private
 * @param {string} dataString
 * @returns {Buffer}
 */
Master.prototype.frameDataString = function(dataString)
{
  var frame = [util.CHR.STX, this.address, util.CHR.EMP];

  for (var i = 0; i < dataString.length; ++i)
  {
    frame.push(dataString.charCodeAt(i));
  }

  if (frame[frame.length - 1] !== util.CHR.SPACE)
  {
    frame.push(util.CHR.SPACE);
  }

  this.appendChecksum(frame);

  frame.push(util.CHR.ETX);

  return new Buffer(frame);
};

/**
 * @private
 * @param {Buffer|Array.<number>} buffer
 * @param {number} length
 * @returns {string}
 */
Master.prototype.generateChecksum = function(buffer, length)
{
  var checksum = 0;

  for (var i = 0; i < length; ++i)
  {
    checksum ^= buffer[i];
  }

  return (checksum < 16 ? '0' : '') + checksum.toString(16).toUpperCase();
};

/**
 * @private
 * @param {Array.<number>} frame
 */
Master.prototype.appendChecksum = function(frame)
{
  var checksum = this.generateChecksum(frame, frame.length);

  frame.push(checksum.charCodeAt(0), checksum.charCodeAt(1));
};

/**
 * @private
 * @param {Buffer} buffer
 */
Master.prototype.checkChecksum = function(buffer)
{
  var checksum = this.generateChecksum(buffer, buffer.length - 3);

  if (checksum.charCodeAt(0) !== buffer[buffer.length - 3] || checksum.charCodeAt(1) !== buffer[buffer.length - 2])
  {
    throw new InvalidChecksumError(buffer, checksum);
  }
};

/**
 * @private
 */
Master.prototype.onClose = function()
{
  if (this.serialPort !== null)
  {
    this.serialPort.removeAllListeners();
    this.serialPort.on('error', function() {});
    this.serialPort = null;
  }

  if (this.sendRequestTimer !== null)
  {
    clearTimeout(this.sendRequestTimer);
    this.sendRequestTimer = null;
  }

  var err = new NoConnectionError();

  this.handleResponse(err, null);

  for (var i = 0; i < this.requestQueue.length; ++i)
  {
    this.requestQueue[i].done(err, null);
  }

  this.requestQueue = [];

  this.emit('close');
};

/**
 * @private
 * @param {Buffer} data
 */
Master.prototype.onData = function(data)
{
  this.emit('rx', data);

  this.incomingData.push(data);

  this.handleIncomingData();
};

/**
 * @private
 */
Master.prototype.handleIncomingData = function()
{
  if (this.incomingData.length === 0)
  {
    return;
  }

  if (this.currentRequest === null)
  {
    return this.incomingData.skip();
  }

  var res = null;

  try
  {
    res = this.currentRequest.responseHandler();
  }
  catch (err)
  {
    this.incomingData.skip();

    return this.handleResponse(err, null);
  }

  if (this.incomingData.length === 0)
  {
    return this.handleResponse(null, res);
  }
};

/**
 * @private
 */
Master.prototype.sendNextRequest = function()
{
  if (this.currentRequest !== null || this.requestQueue.length === 0)
  {
    return;
  }

  this.currentRequest = this.requestQueue.shift();

  var timeFromLastResponse = Date.now() - this.lastResponseAt;

  if (timeFromLastResponse < this.requestDelay)
  {
    this.sendRequestTimer = setTimeout(sendRequest, this.requestDelay - timeFromLastResponse, this);
  }
  else
  {
    setImmediate(sendRequest, this);
  }

  function sendRequest(master)
  {
    master.sendRequestTimer = null;

    if (master.currentRequest === null)
    {
      return;
    }

    master.currentRequest.timer = setTimeout(master.handleResponseTimeout.bind(master), master.responseTimeout);

    master.emit('tx', master.currentRequest.requestBuffer);
    master.serialPort.write(master.currentRequest.requestBuffer);
    master.emit('request', master.currentRequest);
  }
};

/**
 * @private
 * @param {Error|null} err
 * @param {object|null} res
 */
Master.prototype.handleResponse = function(err, res)
{
  if (this.incomingData.length > 0)
  {
    this.incomingData.skip();
  }

  var req = this.currentRequest;

  if (req === null)
  {
    return;
  }

  this.lastResponseAt = Date.now();
  this.currentRequest = null;

  clearTimeout(req.timer);
  req.timer = null;

  this.emit('response', req, err, res);

  req.done(err, res);

  this.sendNextRequest();
};

/**
 * @private
 */
Master.prototype.handleResponseTimeout = function()
{
  this.handleResponse(new ResponseTimeoutError(), null);
};

/**
 * @private
 */
Master.prototype.handleResponseBuffer = function()
{
  return this.incomingData.readByte(this.incomingData.length - 1) === util.CHR.ETX
    ? this.incomingData.shiftBuffer(this.incomingData.length)
    : null;
};

/**
 * @private
 * @throws {InvalidResponseError}
 * @throws {InvalidChecksumError}
 * @throws {BusyTesterError}
 */
Master.prototype.handleSendDataResponse = function()
{
  if (this.incomingData.length !== 1)
  {
    throw new InvalidResponseError(this.incomingData);
  }

  switch (this.incomingData.readByte(0))
  {
    case util.CHR.ACK:
    {
      this.incomingData.skip();

      return null;
    }

    case util.CHR.NAK:
      throw new InvalidChecksumError();

    case util.CHR.BEL:
      throw new BusyTesterError();

    default:
      throw new InvalidResponseError(this.incomingData);
  }
};

/**
 * @private
 * @returns {Response|null}
 * @throws {InvalidResponseError}
 * @throws {InvalidChecksumError}
 */
Master.prototype.handleGetActualValuesResponse = function()
{
  if (this.incomingData.length === 1)
  {
    if (this.incomingData.readByte(0) === util.CHR.NAK)
    {
      this.incomingData.skip();

      return null;
    }

    throw new InvalidResponseError(this.incomingData);
  }

  if (this.incomingData.readByte(0) !== util.CHR.ACK)
  {
    throw new InvalidResponseError(this.incomingData);
  }

  if (this.incomingData.readByte(this.incomingData.length - 1) !== util.CHR.ETX)
  {
    return null;
  }

  var responseBuffer = this.incomingData.shiftBuffer(this.incomingData.length);

  if (responseBuffer[1] !== util.CHR.SYN || responseBuffer[2] !== this.address)
  {
    throw new InvalidResponseError(this.incomingData);
  }

  this.checkChecksum(responseBuffer);

  switch (responseBuffer[3])
  {
    case constants.ResponseType.ACTUAL_VALUES:
      return ActualValuesResponse.fromResponseBuffer(constants.ResponseType.ACTUAL_VALUES, responseBuffer);

    case constants.ResponseType.SELF_TESTS_ACTUAL_VALUES:
      return ActualValuesResponse.fromResponseBuffer(constants.ResponseType.SELF_TESTS_ACTUAL_VALUES, responseBuffer);

    case constants.ResponseType.ORDER_DATA_DEMAND:
      return OrderDataDemandResponse.fromResponseBuffer(responseBuffer);

    case constants.ResponseType.INTERIM_ACTUAL_VALUES:
      return InterimActualValuesResponse.fromResponseBuffer(responseBuffer);

    case constants.ResponseType.DEVICE_OPTIONS:
      return DeviceOptionsResponse.fromResponseBuffer(responseBuffer);

    default:
      throw new InvalidResponseError(responseBuffer);
  }
};
