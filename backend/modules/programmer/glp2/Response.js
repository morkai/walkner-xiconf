// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

module.exports = Response;

/**
 * @constructor
 * @param {ResponseType} type
 */
function Response(type)
{
  /**
   * @type {ResponseType}
   */
  this.type = type;
}
