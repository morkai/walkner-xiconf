// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

$(function()
{
  'use strict';

  var $historyEntries = $('#history-entries');

  $('.show-history-entries').click(function()
  {
    var dates = getSelectedDates();

    if (dates.length)
    {
      window.location.href = '/history/' + dates.join('+');
    }
  });

  $('.export-history-entries').click(function()
  {
    var dates = getSelectedDates();

    if (dates.length)
    {
      window.location.href = '/history/' + dates.join('+') + '?export=csv';
    }
  });

  function getSelectedDates()
  {
    var dates = [];

    $historyEntries.find('.active').each(function()
    {
      dates.push(this.innerHTML.trim());
    });

    return dates;
  }
});
