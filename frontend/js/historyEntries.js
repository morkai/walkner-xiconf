// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

$(function()
{
  'use strict';

  $('.table').on('click', 'td', function()
  {
    var $tr = $(this).parent();

    var date = $tr.attr('data-date');
    var id = $tr.attr('data-id');

    window.location.href = '/history/' + date + '/' + id;
  });
});
