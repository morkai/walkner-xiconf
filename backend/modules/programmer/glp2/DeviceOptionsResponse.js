// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('./util');
var constants = require('./constants');
var Response = require('./Response');

module.exports = DeviceOptionsResponse;

/**
 * @constructor
 * @extends {Response}
 * @param {Array.<string>} deviceOptions
 */
function DeviceOptionsResponse(deviceOptions)
{
  Response.call(this, constants.ResponseType.DEVICE_OPTIONS);

  /**
   * @type {Array.<string>}
   */
  this.deviceOptions = deviceOptions;
}

util.inherits(DeviceOptionsResponse, Response);

/**
 * @param {Buffer} responseBuffer
 * @returns {DeviceOptionsResponse}
 */
DeviceOptionsResponse.fromResponseBuffer = function(responseBuffer)
{
  var deviceOptions = util.decodeResponseBuffer(responseBuffer)
    .join(' ')
    .split('_')
    .filter(function(deviceOption) { return deviceOption.length > 0; });

  return new DeviceOptionsResponse(deviceOptions);
};
