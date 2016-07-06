// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const util = require('util');

Object.defineProperty(Error.prototype, 'toJSON', {
  configurable: false,
  enumerable: false,
  writable: true,
  value: function()
  {
    const error = this;
    const result = {
      message: error.message,
      stack: error.stack
    };

    Object.keys(error).forEach(function(property)
    {
      result[property] = error[property];
    });

    return result;
  }
});

console.inspect = function(value, depth, colors)
{
  console.log(util.inspect(value, {depth: depth || null, colors: colors !== false}));
};
