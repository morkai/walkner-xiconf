// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var exec = require('child_process').exec;
var step = require('h5.step');

module.exports = function setUpServiceTagPrinterZpl(app, settings)
{
  var PRINTER_NAME = 'ServiceTagPrinterZPL';
  var PRNMNGR_FILE = 'C:/Windows/System32/Printing_Admin_Scripts/en-US/prnmngr.vbs';

  if (settings.get('serviceTagPrinter') !== PRINTER_NAME || process.platform !== 'win32')
  {
    return;
  }

  step(
    function listPrintersStep()
    {
      settings.debug("Listing printers...");

      exec('CScript /nologo ' + PRNMNGR_FILE + ' -l', this.next());
    },
    function findPrinterPortsStep(err, stdout)
    {
      if (err)
      {
        return this.skip(new Error("Failed to list printers: " + err.message));
      }

      settings.debug("Finding printer ports...");

      if (stdout.indexOf(PRINTER_NAME) !== -1)
      {
        return this.skip();
      }

      var matches;
      var re = /Driver name ZDesigner GK420t\r\nPort name (USB[0-9]+)/gi;

      this.ports = [];

      while ((matches = re.exec(stdout)) !== null)
      {
        this.ports.push(matches[1]);
      }
    },
    function addPrinterPortsStep()
    {
      for (var i = 0; i < this.ports.length; ++i)
      {
        settings.debug("Adding a new printer on port %s...", this.ports[i]);

        addPrinterPort(this.ports[i], i, this.group());
      }
    },
    function finalizeStep(err)
    {
      if (err)
      {
        settings.error("Failed to set up the Service Tag printer: %s", err.message);
      }
      else
      {
        settings.info("The Service Tag ZPL printer is set up.");
      }
    }
  );

  function addPrinterPort(port, i, done)
  {
    var name = PRINTER_NAME;

    if (i > 0)
    {
      name += '-' + (i + 1);
    }

    var args = [
      '-a',
      '-p', '"' + name + '"',
      '-r', '"' + port + '"',
      '-m', '"Generic / Text Only"'
    ];

    exec('CScript /nologo ' + PRNMNGR_FILE + ' ' + args.join(' '), done);
  }
};
