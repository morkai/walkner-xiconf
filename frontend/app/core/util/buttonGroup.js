// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([

], function(

) {
  'use strict';

  return {

    toggle: function($group)
    {
      $group.find('input:checked').parent().addClass('active');
    },

    getValue: function($group)
    {
      var $inputs = $group.find('input');

      if ($inputs[0].type === 'radio' || $inputs.length === 1)
      {
        return $inputs.filter(':checked').val();
      }

      return $inputs.filter(':checked').map(function() { return this.value; }).get();
    }

  };
});
