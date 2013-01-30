$(function()
{
  if (!window.CONFIG)
  {
    window.CONFIG = {
      programming: false,
      minAoc: 0,
      maxAoc: 1000
    };
  }

  var $aoc = $('#aoc');
  var $program = $('#program');
  var $status = $('.status');
  var $statusTime = $('#status-time');
  var $result = $('#result');
  var $history = $('#history');

  $status.hide();
  $status.filter('#status-wait').show();

  var size = window.innerHeight;

  $('#container').children().not('#result').filter(':visible').each(function()
  {
    size -= $(this).outerHeight(true);
  });

  $result.css({
    width: size + 'px',
    height: size + 'px'
  });

  $result.roundabout({
    clickToFocus: false
  });

  $('#programForm').submit(function()
  {
    if ($program.is(':disabled'))
    {
      return false;
    }

    var aoc = parseInt($aoc.val());

    if (isNaN(aoc) || aoc > CONFIG.maxAoc || aoc < CONFIG.minAoc)
    {
      $aoc.val('');
      $aoc.focus();

      return false;
    }

    $program.attr('disabled', true);
    $aoc.attr('disabled', true);

    changeStatus('program', aoc);

    var req = $.ajax({
      type: 'post',
      url: '/program',
      dataType: 'json',
      data: {
        aoc: aoc
      }
    });

    req.always(function()
    {
      $program.attr('disabled', false);
      $aoc.attr('disabled', false);
      $aoc.val('');
      $aoc.focus();
    });

    req.fail(function()
    {
      changeStatus('failure', aoc);
    });

    req.done(function(historyEntry)
    {
      handleProgrammingResult(historyEntry);
    });

    return false;
  });

  $aoc.blur(function()
  {
    setTimeout(function() { $aoc.focus(); }, 1);
  });

  function handleProgrammingResult(historyEntry)
  {
    addHistoryEntry(historyEntry);

    if (historyEntry.result)
    {
      changeStatus('success', historyEntry.aoc);
    }
    else
    {
      changeStatus('failure', historyEntry.aoc);
    }
  }

  function addHistoryEntry(historyEntry)
  {
    var $historyEntry = $('<li class="btn"></li>');

    $historyEntry.addClass(
      historyEntry.result ? 'btn-success' : 'btn-danger'
    );

    $historyEntry.html(
      historyEntry.aoc + ' @ ' + historyEntry.timeString
    );

    $history.append($historyEntry);

    $historyEntry.hide();
    $historyEntry.css('opacity', 1);
    $historyEntry.fadeIn(function()
    {
      setTimeout(function() {
        $historyEntry.fadeTo(400, .3, function()
        {
          $historyEntry.css('opacity', '');
        });
      }, 3000);
    });

    var $children = $history.children();

    if ($children.length > 20)
    {
      $children.first().remove();
    }
  }

  function changeStatus(newStatus, aoc)
  {
    var $newStatus = $status.filter('#status-' + newStatus);

    if (!$newStatus.length)
    {
      return;
    }

    var now = new Date();

    $statusTime.show().text(
      add0(now.getHours()) + ':' +
      add0(now.getMinutes()) + ':' +
      add0(now.getSeconds())
    );

    focusResult(newStatus);

    $newStatus.find('.status-aoc').text(aoc);
    $status.filter(':visible').hide();
    $newStatus.fadeIn();
  }

  function focusResult(result, done)
  {
    var childPosition = $result.find('li').index($('#result-' + result));

    if ($result.roundabout('getChildInFocus') === childPosition)
    {
      return done && done();
    }

    $result.roundabout(
      'animateToChild', childPosition, 300, done || function() {}
    );
  }

  function add0(str)
  {
    str = str + '';

    return (str.length === 1 ? '0' : '') + str;
  }
});
