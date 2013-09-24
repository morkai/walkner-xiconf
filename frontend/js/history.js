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
