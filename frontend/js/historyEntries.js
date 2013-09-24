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
