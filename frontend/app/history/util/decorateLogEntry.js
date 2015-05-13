// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/i18n',
  'app/time'
], function(
  t,
  time
) {
  'use strict';

  return function decorateLogEntry(logEntry)
  {
    if (typeof logEntry.duration === 'number')
    {
      logEntry.duration = time.toString(logEntry.duration / 1000, false, true);
    }

    if (logEntry.errorCode !== undefined)
    {
      logEntry.error = t('history', 'error:' + logEntry.errorCode);
    }

    var moment = time.getMoment(logEntry.time);

    return {
      datetime: moment.toISOString(),
      time: moment.format('HH:mm:ss.SSS'),
      text: t('history', 'log:' + logEntry.text, logEntry)
    };
  };
});
