// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('util');

Object.defineProperty(Error.prototype, 'toJSON', {
  configurable: false,
  enumerable: false,
  writable: true,
  value: function()
  {
    var error = this;
    var result = {
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
