// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');
var step = require('h5.step');
var request = require('request');
var JSZip = require('jszip');
var ursa = require('ursa');

module.exports = function setUpRemoteExport(app, historyModule)
{
  var db = app[historyModule.config.sqlite3Id].db;
  var settings = app[historyModule.config.settingsId];

  var syncTimer = null;
  var cachedEncryptedUuids = {};

  app.broker.subscribe('app.started', syncNow).setLimit(1);

  function isValidLicense()
  {
    if (!settings.supportsFeature('wmes'))
    {
      return false;
    }

    var licenseInfo = settings.get('licenseInfo');

    return !licenseInfo.error || licenseInfo.error === 'UNKNOWN_LICENSE' || licenseInfo.error === 'DUPLICATE_LICENSE';
  }

  function scheduleNextSync(failed, hasMore)
  {
    if (syncTimer !== null)
    {
      clearTimeout(syncTimer);
    }

    var minute = 60 * 1000;
    var syncInterval = settings.get('syncInterval');
    var syncDelay = syncInterval * minute;

    if (isNaN(syncDelay) || syncDelay < minute)
    {
      syncDelay = minute;
    }

    if (hasMore)
    {
      syncDelay = 1337;
    }
    else if (failed)
    {
      syncDelay = Math.max(Math.round(syncDelay / 2), 10 * minute);
    }

    syncTimer = setTimeout(syncNow, syncDelay);
  }

  function syncNow()
  {
    if (!isValidLicense())
    {
      historyModule.warn("Stopping the remote export: invalid license :(");

      return scheduleNextSync(true);
    }

    step(
      pingRemoteServerStep,
      readLastExportTimeStep,
      findHistoryEntriesStep,
      findOrdersStep,
      initArchiveStep,
      packFeatureFilesStep,
      generateArchiveStep,
      sendArchiveStep,
      saveLastExportTimeStep,
      finalizeStep
    );
  }

  function pingRemoteServerStep()
  {
    /*jshint validthis:true*/

    this.remoteUrl = url.parse(settings.get('remoteServer'));
    this.remoteUrl.pathname = '/ping';

    var pingUrl = url.format(this.remoteUrl);

    if (!this.remoteUrl.protocol || !this.remoteUrl.host)
    {
      return this.skip(new Error("invalid remote server setting :("));
    }

    var next = this.next();

    request.head({url: pingUrl}, function(err, res)
    {
      if (err)
      {
        return next(err);
      }

      if (res.statusCode >= 400)
      {
        return next(new Error("remote server returned a " + res.statusCode + " response :("));
      }

      return setImmediate(next);
    });
  }

  function readLastExportTimeStep(err)
  {
    /*jshint validthis:true*/

    if (err)
    {
      return this.skip(err);
    }

    var ctx = this;
    var next = this.next();

    fs.readFile(historyModule.config.lastExportTimeFile, 'utf8', function(err, contents)
    {
      if (err && err.code !== 'ENOENT')
      {
        return next(err);
      }

      var lastExportTime = parseInt(contents, 10);

      if (isNaN(lastExportTime) || lastExportTime < 0)
      {
        lastExportTime = 0;
      }

      ctx.lastExportTime = lastExportTime;

      return setImmediate(next);
    });
  }

  function findHistoryEntriesStep(err)
  {
    /*jshint validthis:true*/

    if (err)
    {
      return this.skip(err);
    }

    var ctx = this;
    var next = this.next();
    var sql = "SELECT * FROM historyEntries WHERE startedAt > $startedAt ORDER BY startedAt ASC LIMIT 101";

    db.all(sql, {$startedAt: this.lastExportTime}, function(err, rows)
    {
      if (err)
      {
        return next(err);
      }

      if (rows.length === 101)
      {
        ctx.hasMore = true;

        rows.pop();
      }

      ctx.historyEntries = JSON.stringify(rows);
      ctx.latestStartedAt = rows.length ? rows[rows.length - 1].startedAt : null;
      ctx.featureFileHashes = {};
      ctx.orderIds = {};

      for (var i = 0, l = rows.length; i < l; ++i)
      {
        var row = rows[i];

        if (row.featureFileHash !== null)
        {
          ctx.featureFileHashes[row.featureFileHash] = true;
        }

        if (row.gprsOrderFileHash !== null)
        {
          ctx.featureFileHashes[row.gprsOrderFileHash] = true;
        }

        if (row.gprsInputFileHash !== null)
        {
          ctx.featureFileHashes[row.gprsInputFileHash] = true;
        }

        if (row.gprsOutputFileHash !== null)
        {
          ctx.featureFileHashes[row.gprsOutputFileHash] = true;
        }

        if (row._order)
        {
          ctx.orderIds[row._order] = true;
        }
      }

      return setImmediate(next);
    });
  }

  function findOrdersStep(err)
  {
    /*jshint validthis:true*/

    if (err)
    {
      return this.skip(err);
    }

    var orderIds = Object.keys(this.orderIds);

    this.orderIds = null;

    if (orderIds.length === 0)
    {
      return;
    }

    orderIds = orderIds.map(function(orderId) { return '"' + orderId + '"'; }).join(', ');

    var ctx = this;
    var next = this.next();
    var sql = "SELECT * FROM orders WHERE _id IN(" + orderIds + ") ORDER BY startedAt ASC";

    db.all(sql, function(err, rows)
    {
      if (err)
      {
        return next(err);
      }

      ctx.orders = JSON.stringify(rows);

      return setImmediate(next);
    });
  }

  function initArchiveStep(err)
  {
    /*jshint validthis:true*/

    if (err)
    {
      return this.skip(err);
    }

    if (this.latestStartedAt === null)
    {
      return this.skip();
    }

    var uuid = settings.get('licenseInfo').uuid;

    if (!cachedEncryptedUuids[uuid])
    {
      cachedEncryptedUuids[uuid] = ursa.createPublicKey(settings.config.licenseEdPem).encrypt(uuid, 'utf8', 'base64');
    }

    this.zip = new JSZip();
    this.zip.file('meta.json', JSON.stringify({
      id: settings.getInstallationId(),
      title: settings.get('title'),
      uuid: cachedEncryptedUuids[uuid]
    }));
    this.zip.file('orders.json', this.orders);
    this.zip.file('results.json', this.historyEntries);
    this.zip.folder('features');

    this.orders = null;
    this.historyEntries = null;

    setImmediate(this.next());
  }

  function packFeatureFilesStep(err)
  {
    /*jshint validthis:true*/

    if (err)
    {
      return this.skip(err);
    }

    var featureFileHashes = Object.keys(this.featureFileHashes);

    this.featureFileHashes = null;

    if (featureFileHashes.length === 0)
    {
      return;
    }

    var featuresZip = this.zip.folder('features');

    step(
      function()
      {
        var ctx = this;

        featureFileHashes.forEach(function(featureFileHash)
        {
          var featureFilePath = path.join(historyModule.config.featureDbPath, featureFileHash);
          var next = ctx.parallel();

          fs.readFile(featureFilePath, function(err, buf)
          {
            if (buf)
            {
              featuresZip.file(featureFileHash, buf);
            }

            return next();
          });
        });
      },
      this.next()
    );
  }

  function generateArchiveStep()
  {
    /*jshint validthis:true*/

    this.archive = this.zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    this.zip = null;

    setImmediate(this.next());
  }

  function sendArchiveStep()
  {
    /*jshint validthis:true*/

    this.remoteUrl.pathname = '/xiconf;import';

    var resultsUrl = url.format(this.remoteUrl);

    var options = {
      url: resultsUrl,
      body: this.archive,
      headers: {
        'content-type': 'application/zip',
        'accepts': 'text/plain'
      },
      qs: {
        uuid: settings.get('licenseInfo').uuid
      }
    };

    this.archive = null;

    var next = this.next();

    request.post(options, function(err, res, body)
    {
      if (err)
      {
        return next(err);
      }

      if (res.statusCode >= 400)
      {
        if (body === 'UNKNOWN_LICENSE' || body === 'DUPLICATE_LICENSE')
        {
          var licenseInfo = settings.get('licenseInfo');

          if (licenseInfo.error !== body)
          {
            licenseInfo.error = body;

            app.broker.publish('settings.changed', {licenseInfo: licenseInfo});
          }
        }

        return next(new Error(
          "remote server returned a " + res.statusCode + " response: " + body
        ));
      }

      return next();
    });
  }

  function saveLastExportTimeStep(err)
  {
    /*jshint validthis:true*/

    if (err)
    {
      return this.skip(err);
    }

    var file = historyModule.config.lastExportTimeFile;
    var contents = this.latestStartedAt.toString();

    fs.writeFile(file, contents, this.next());
  }

  function finalizeStep(err)
  {
    /*jshint validthis:true*/

    this.historyEntries = null;
    this.featureFileHashes = null;
    this.orders = null;
    this.orderIds = null;
    this.zip = null;
    this.remoteUrl = null;

    if (err)
    {
      historyModule.error("Failed to export data to the remote server: %s", err.message);
    }
    else
    {
      var licenseInfo = settings.get('licenseInfo');

      if (licenseInfo.error === 'UNKNOWN_LICENSE' || licenseInfo.error === 'DUPLICATE_LICENSE')
      {
        licenseInfo.error = null;

        app.broker.publish('settings.changed', {licenseInfo: licenseInfo});
      }
    }

    scheduleNextSync(!!err, !!this.hasMore);
  }
};
