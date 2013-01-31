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
    var $historyEntry = $('<li><a href="" class="btn"></a></li>');
    var $a = $historyEntry.find('a');

    $a.addClass(
      historyEntry.result ? 'btn-success' : 'btn-danger'
    );

    $a.attr(
      'href',
      '/history/' + historyEntry.dateString + '/' + historyEntry.id
    );

    $a.html(
      historyEntry.aoc + ' @ ' + historyEntry.timeString
    );

    var $children = $history.children();

    $historyEntry.insertBefore($children.last());

    $a.hide();
    $a.css('opacity', 1);
    $a.fadeIn(function()
    {
      setTimeout(function() {
        $a.fadeTo(400, .3, function()
        {
          $a.css('opacity', '');
        });
      }, 3000);
    });

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

  var focusQueue = [];
  var focusing = false;

  function focusResult(result, done)
  {
    if (focusing)
    {
      focusQueue.push([result, done]);

      return;
    }

    focusing = true;

    var childPosition = $result.find('li').index($('#result-' + result));

    if ($result.roundabout('getChildInFocus') === childPosition)
    {
      focusing = false;

      done && done();

      if (focusQueue.length)
      {
        focusResult.apply(null, focusQueue.shift());
      }

      return;
    }

    $result.roundabout(
      'animateToChild', childPosition, 300, function()
      {
        focusing = false;

        done && done();

        if (focusQueue.length)
        {
          focusResult.apply(null, focusQueue.shift());
        }
      }
    );
  }

  function add0(str)
  {
    str = str + '';

    return (str.length === 1 ? '0' : '') + str;
  }

  setTimeout(function() { $result.hide(); }, 100);
  setTimeout(function() { $result.show(); }, 200);

  $result.find('img').each(function(i, el)
  {
    var $img = $(this);

    setTimeout(function() { $img.hide(); }, 100 * i + 300);
    setTimeout(function() { $img.show(); }, 100 * i + 400);
  });
});
