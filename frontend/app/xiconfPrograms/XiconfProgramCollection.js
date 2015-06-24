// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  '../core/Collection',
  './XiconfProgram'
], function(
  _,
  Collection,
  XiconfProgram
) {
  'use strict';

  return Collection.extend({

    model: XiconfProgram,

    rqlQuery: 'limit(15)'

  });
});
