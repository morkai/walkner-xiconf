// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
