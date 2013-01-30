$(function()
{
  var $aoc = $('#aoc');
  var $program = $('#program');
  var $status = $('.status');
  var $statusTime = $('#status-time');
  var $result = $('#result');

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

    if (isNaN(aoc))
    {
      $aoc.val('');
      $aoc.focus();

      return false;
    }

    $program.attr('disabled', true);

    changeStatus('program', aoc);

    focusResult('late', function()
    {
      var req = $.ajax({
        type: 'post',
        url: '/program',
        data: {
          aoc: aoc
        }
      });

      req.always(function(xhr)
      {
        $aoc.val('');
        $aoc.focus();
      });

      req.fail(function(xhr)
      {
        changeStatus('failure', aoc);

        focusResult('bad', function()
        {
          $program.attr('disabled', false);
        });
      });

      req.done(function(data)
      {
        changeStatus('success', aoc);

        focusResult('good', function()
        {
          $program.attr('disabled', false);
        });
      });
    });

    return false;
  });

  $aoc.blur(function()
  {
    setTimeout(function()
    {
      $aoc.focus();
    }, 1);
  });

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
