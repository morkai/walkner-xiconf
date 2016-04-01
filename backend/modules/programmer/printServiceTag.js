// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var format = require('util').format;
var exec = require('child_process').exec;
var tmpdir = require('os').tmpdir;
var path = require('path');
var fs = require('fs');
var step = require('h5.step');

var ASCII = {
  NUL: 0,
  SOH: 1,
  STX: 2,
  ETX: 3,
  EOT: 4,
  ENQ: 5,
  ACK: 6,
  BEL: 7,
  BS: 8,
  TAB: 9,
  LF: 10,
  VT: 11,
  FF: 12,
  CR: 13,
  SO: 14,
  SI: 15,
  DLE: 16,
  DC1: 17,
  DC2: 18,
  DC3: 19,
  DC4: 20,
  NAK: 21,
  SYN: 22,
  ETB: 23,
  CAN: 24,
  EM: 25,
  SUB: 26,
  ESC: 27,
  FS: 28,
  GS: 29,
  RS: 30,
  US: 31
};

module.exports = function printServiceTag(spoolFile, printerName, labelType, labelCode, serviceTag, done)
{
  var cancelTimer = setTimeout(cancel, 10000);
  var finished = false;

  function cancel()
  {
    if (finished)
    {
      return;
    }

    cancelTimer = null;
    finished = true;

    return done();
  }

  function insertServiceTag(labelCode, labelType, serviceTag)
  {
    labelCode = labelCode.replace(new RegExp('P[0-9]{' + (serviceTag.length - 1) + '}', 'g'), serviceTag);

    if (labelType !== 'zpl')
    {
      return labelCode;
    }

    return labelCode.replace(/\^FD(.*?)\^FS/g, function(command, data)
    {
      if (!/^>(:|;|9)P/.test(data))
      {
        return command;
      }

      var remaining = serviceTag;

      return command.replace(/>(:|;|5|6|7|9)([a-zA-Z0-9]+)/g, function(_, invocationCode, data)
      {
        var part = remaining.substr(0, data.length);

        remaining = remaining.substr(data.length);

        return '>' + invocationCode + part;
      });
    });
  }

  step(
    function prepareLabelCodeStep()
    {
      labelCode = labelCode.replace(/<CR>/g, '\r').replace(/<LF>/g, '\n').replace(/\r|\n/g, '\n').trim();

      if (labelType === 'zpl')
      {
        labelCode = labelCode.replace(/\n+/g, '<CR><LF>');
      }
      else
      {
        labelCode = labelCode.replace(/\n+/g, '<CR>');
      }

      labelCode = insertServiceTag(labelCode, labelType, serviceTag).replace(/<([A-Z]{2,3})>/g, function(_, code)
      {
        return ASCII[code] === undefined ? ('%' + code) : String.fromCharCode(ASCII[code]);
      });
    },
    function createLabelFileStep()
    {
      this.labelFile = path.join(tmpdir(), 'XICONF-SERVICE_TAG-' + serviceTag + '.' + labelType);

      fs.writeFile(this.labelFile, new Buffer(labelCode, 'ascii'), this.next());
    },
    function spoolLabelFileStep(err)
    {
      if (finished || err)
      {
        return this.skip(err);
      }

      var cmd = format('"%s" "%s" "%s"', spoolFile, this.labelFile, printerName);

      exec(cmd, {timeout: 5000}, this.next());
    },
    function finalizeStep(err)
    {
      if (finished)
      {
        return;
      }

      clearTimeout(cancelTimer);
      cancelTimer = null;

      finished = true;

      if (err)
      {
        err.code = 'PRINTING_SERVICE_TAG_FAILURE';

        return done(err);
      }

      if (this.labelFile)
      {
        fs.unlink(this.labelFile, function() {});
      }

      return done();
    }
  );

  return cancel;
};
