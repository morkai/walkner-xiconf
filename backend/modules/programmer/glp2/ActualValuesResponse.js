// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('./util');
var InvalidResponseError = require('./InvalidResponseError');
var Response = require('./Response');
var DefaultTestResult = require('./DefaultTestResult');
var VisTestResult = require('./VisTestResult');
var HvTestResult = require('./HvTestResult');

module.exports = ActualValuesResponse;

var STEP_NUMBER_RE = /^[0-9]{3}$/;
var MESSAGE_COUNTER_RE = /^x[A-Fa-f0-9]{2}$/;
var METADATA_RE = /^(NUM|SN|NAME|PR|F|DA|ST|ORDER)_(.*?)$/;
var METADATA_PROPERTIES = {
  NUM: 'counter',
  SN: 'serialNumber',
  NAME: 'programName',
  PR: 'operatorName',
  F: 'faultStatus',
  DA: 'date',
  ST: 'testStation',
  ORDER: 'orderData'
};
var TEST_METHOD_TO_RESULT = {
  PE: DefaultTestResult,
  ISO: DefaultTestResult,
  FKT: DefaultTestResult,
  ABL: DefaultTestResult,
  RSP: DefaultTestResult,
  ERS: DefaultTestResult,
  R: DefaultTestResult,
  HV: HvTestResult,
  SPR: VisTestResult
};

/**
 * @constructor
 * @extends {Response}
 * @param {ResponseType} type
 * @param {Array.<TestResult>} steps
 * @param {boolean} completed
 * @param {number} counter
 * @param {string} serialNumber
 * @param {string} programName
 * @param {string} operatorName
 * @param {number} faultStatus
 * @param {Date} date
 * @param {number} testStation
 * @param {Array.<string>} orderData
 * @param {number} messageCounter
 */
function ActualValuesResponse(
  type,
  steps,
  completed,
  counter,
  serialNumber,
  programName,
  operatorName,
  faultStatus,
  date,
  testStation,
  orderData,
  messageCounter)
{
  Response.call(this, type);

  /**
   * @type {Array.<TestResult>}
   */
  this.steps = steps;

  /**
   * @type {boolean}
   */
  this.completed = completed;

  /**
   * @type {number}
   */
  this.counter = counter;

  /**
   * @type {string}
   */
  this.serialNumber = serialNumber;

  /**
   * @type {string}
   */
  this.programName = programName;

  /**
   * @type {string}
   */
  this.operatorName = operatorName;

  /**
   * @type {number}
   */
  this.faultStatus = faultStatus;

  /**
   * @type {string}
   */
  this.faultText = util.getFaultText(faultStatus);

  /**
   * @type {Date}
   */
  this.date = date;

  /**
   * @type {number}
   */
  this.testStation = testStation;

  /**
   * @type {Array.<string>}
   */
  this.orderData = orderData;

  /**
   * @type {number}
   */
  this.messageCounter = messageCounter;
}

util.inherits(ActualValuesResponse, Response);

/**
 * @param {ResponseType} type
 * @param {Buffer} responseBuffer
 * @returns {ActualValuesResponse}
 * @throws {InvalidResponseError}
 */
ActualValuesResponse.fromResponseBuffer = function(type, responseBuffer)
{
  var data = util.decodeResponseBuffer(responseBuffer);

  if (data.length === 0)
  {
    throw new InvalidResponseError(responseBuffer);
  }

  var steps = [];
  var completed = false;
  var counter = -1;
  var serialNumber = '';
  var programName = '';
  var operatorName = '';
  var faultStatus = 0;
  var date = null;
  var testStation = -1;
  var orderData = null;
  var messageCounter = -1;

  while (data.length)
  {
    var part = data.shift();

    if (part === 'END')
    {
      completed = true;

      break;
    }

    if (STEP_NUMBER_RE.test(part))
    {
      steps.push(parseTestStepData(+part, data, responseBuffer));

      continue;
    }

    if (MESSAGE_COUNTER_RE.test(part))
    {
      messageCounter = parseInt('0' + part, 16);

      continue;
    }

    var matches = part.match(METADATA_RE);

    if (matches === null)
    {
      continue;
    }

    var metadataProperty = METADATA_PROPERTIES[matches[1]];
    var metadataValue = matches[2];

    switch (metadataProperty)
    {
      case 'counter':
        counter = parseInt(metadataValue, 10) || -1;
        break;

      case 'faultStatus':
        faultStatus = parseInt(metadataValue, 10) || -1;
        break;

      case 'testStation':
        testStation = parseInt(metadataValue, 10) || -1;
        break;

      case 'SN':
        serialNumber = util.decodeStringValue(metadataValue);
        break;

      case 'NAME':
        programName = util.decodeStringValue(metadataValue);
        break;

      case 'PR':
        operatorName = util.decodeStringValue(metadataValue);
        break;

      case 'DA':
        date = util.decodeDateValue(metadataValue);
        break;

      case 'ORDER':
        orderData = util.decodeOrderDataValue(metadataValue);
        break;
    }
  }

  if (date === null)
  {
    date = new Date(0);
  }

  if (orderData === null)
  {
    orderData = [];
  }

  return new ActualValuesResponse(
    type,
    steps,
    completed,
    counter,
    serialNumber,
    programName,
    operatorName,
    faultStatus,
    date,
    testStation,
    orderData,
    messageCounter
  );
};

/**
 * @private
 * @param {number} stepNumber
 * @param {Array.<string>} data
 * @param {Buffer} responseBuffer
 * @returns {TestResult}
 * @throws {InvalidResponseError}
 */
function parseTestStepData(stepNumber, data, responseBuffer)
{
  if (isNaN(stepNumber) || stepNumber < 1 || data.length < 3)
  {
    throw new InvalidResponseError(responseBuffer);
  }

  var testMethod = data.shift();
  var TestResult = TEST_METHOD_TO_RESULT[testMethod];

  if (TestResult === undefined)
  {
    throw new InvalidResponseError(responseBuffer);
  }

  var testResult = TestResult.fromResponseData(testMethod, stepNumber, data);

  if (testResult === null)
  {
    throw new InvalidResponseError(responseBuffer);
  }

  return testResult;
}
