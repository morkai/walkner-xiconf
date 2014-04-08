// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

var socket = io.connect();

$(function()
{
  /*jshint maxstatements:999*/

  'use strict';

  if (!window.CONFIG)
  {
    window.CONFIG = {
      state: 'wait',
      historyEntry: null
    };
  }

  var focusQueue = [];
  var focusing = false;

  var $nc = $('#nc');
  var $program = $('#program');
  var $state = $('.state');
  var $stateTime = $('#state-time');
  var $result = $('#result');
  var $history = $('#history');

  $state.hide();
  $state.filter('#state-wait').show();

  var size = window.innerHeight;

  $('#container').children().not('#result').filter(':visible').each(function()
  {
    size -= $(this).outerHeight(true);
  });

  $result.css({
    width: size + 'px',
    height: size + 'px'
  });

  $(window).on('load', function()
  {
    $result.roundabout({
      clickToFocus: false
    });

    changeState(window.CONFIG.state, window.CONFIG.historyEntry || {});
  });

  $('#programForm').submit(function()
  {
    if ($program.is(':disabled'))
    {
      return false;
    }

    var nc = $nc.val();

    if (!/^[0-9]{12}$/.test(nc))
    {
      $nc.val('');
      $nc.focus();

      return false;
    }

    $program.attr('disabled', true);
    $nc.attr('disabled', true);

    changeState('wait');

    socket.emit('program', nc, function(err)
    {
      if (err)
      {
        changeState('failure', {error: err.message, nc: nc});

        $program.attr('disabled', false);
        $nc.attr('disabled', false).val('');
      }
    });

    return false;
  });

  socket.on('state changed', function(newState, historyEntry)
  {
    changeState(newState, historyEntry);

    switch (newState)
    {
      case 'program':
        $program.attr('disabled', true);
        $nc.attr('disabled', true).val(historyEntry.nc);
        break;

      case 'success':
      case 'failure':
        addHistoryEntry(historyEntry);

        $program.attr('disabled', false);
        $nc.attr('disabled', false).val('');
        break;
    }
  });

  $nc.blur(function()
  {
    setTimeout(function() { $nc.focus(); }, 1);
  });

  function addHistoryEntry(historyEntry)
  {
    var $historyEntry = $('<li><a href="" class="btn"></a></li>');
    var $a = $historyEntry.find('a');

    $a.addClass(
      historyEntry.error ? 'btn-danger' : 'btn-success'
    );

    $a.attr(
      'href',
      '/history/' + historyEntry.dateString + '/' + historyEntry.id
    );

    $a.html(
      historyEntry.nc + ' @ ' + historyEntry.timeString
    );

    var $children = $history.children();

    $historyEntry.insertBefore($children.last());

    $a.hide();
    $a.css('opacity', 1);
    $a.fadeIn(function()
    {
      setTimeout(
        function()
        {
          $a.fadeTo(400, 0.3, function() { $a.css('opacity', ''); });
        },
        3000
      );
    });

    if ($children.length > 20)
    {
      $children.first().remove();
    }
  }

  function changeState(newState, historyEntry)
  {
    var $newState = $state.filter('#state-' + newState);

    if (!$newState.length)
    {
      return;
    }

    var now = new Date();

    $stateTime.show().text(
      add0(now.getHours()) + ':' +
      add0(now.getMinutes()) + ':' +
      add0(now.getSeconds())
    );

    focusResult(newState === 'wait' ? 'program' : newState);

    $newState.find('[data-property]').each(function()
    {
      var $property = $(this);

      var value = getPropertyValue(
        historyEntry, $property.attr('data-property')
      );

      if (value === null)
      {
        $property.hide();
      }
      else
      {
        $property.text(value).show();
      }
    });

    $state.filter(':visible').hide();
    $newState.fadeIn();
  }

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

      if (done)
      {
        done();
      }

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

        if (done)
        {
          done();
        }

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

  function getPropertyValue(obj, path)
  {
    path = path.split('.');

    while (path.length)
    {
      if (obj === null || typeof obj !== 'object')
      {
        return obj;
      }

      var property = path.shift();

      if (!obj.hasOwnProperty(property))
      {
        return null;
      }

      obj = obj[property];
    }

    return obj;
  }
});
