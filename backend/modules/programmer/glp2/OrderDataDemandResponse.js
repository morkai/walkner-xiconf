// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('./util');
var constants = require('./constants');
var Response = require('./Response');

module.exports = OrderDataDemandResponse;

/**
 * @constructor
 * @extends {Response}
 * @param {Array.<string>} orderData
 */
function OrderDataDemandResponse(orderData)
{
  Response.call(this, constants.ResponseType.ORDER_DATA_DEMAND);

  /**
   * @type {Array.<string>}
   */
  this.orderData = orderData;
}

util.inherits(OrderDataDemandResponse, Response);

/**
 * @param {Buffer} responseBuffer
 * @returns {OrderDataDemandResponse}
 */
OrderDataDemandResponse.fromResponseBuffer = function(responseBuffer)
{
  return new OrderDataDemandResponse(util.decodeResponseBuffer(responseBuffer).map(util.decodeStringValue));
};
