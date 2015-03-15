// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var Order = require('./Order');

module.exports = HistoryEntry;

function HistoryEntry(db, broker)
{
  this.db = db;
  this.broker = broker;

  this.inputMode = 'local';
  this.workMode = 'programming';
  this.inProgress = false;
  this.overallProgress = 0;
  this.remoteData = null;
  this.remoteConnected = false;
  this.selectedNc12 = null;

  this.clear();
}

HistoryEntry.prototype.toJSON = function()
{
  return {
    _id: this._id,
    order: this.order ? this.order.toJSON() : null,
    nc12: this.nc12,
    serviceTag: this.serviceTag,
    counter: this.counter,
    startedAt: this.startedAt,
    finishedAt: this.finishedAt,
    duration: this.duration,
    log: Array.isArray(this.log) ? [].concat(this.log) : null,
    result: this.result,
    errorCode: this.errorCode,
    exception: this.exception,
    output: this.output,
    featureFile: this.featureFile,
    featureFileName: this.featureFileName,
    featureFileHash: this.featureFileHash,
    feature: this.feature,
    workflowFile: this.workflowFile,
    workflow: this.workflow,
    countdown: this.countdown,
    program: this.program,
    steps: this.steps,
    inputMode: this.inputMode,
    workMode: this.workMode,
    inProgress: this.inProgress,
    overallProgress: this.overallProgress,
    remoteData: this.remoteData,
    remoteConnected: this.remoteConnected,
    selectedNc12: this.selectedNc12
  };
};

HistoryEntry.prototype.isInProgress = function()
{
  return this.inProgress;
};

HistoryEntry.prototype.isFinished = function()
{
  return this.finishedAt !== null;
};

HistoryEntry.prototype.clear = function(clearOrder, clearProgram)
{
  this._id = null;

  if (clearOrder !== false)
  {
    this.order = null;
    this.counter = null;
  }

  if (clearProgram !== false)
  {
    this.program = null;
  }

  this.nc12 = null;
  this.serviceTag = null;
  this.startedAt = null;
  this.finishedAt = null;
  this.duration = null;
  this.log = null;
  this.result = null;
  this.errorCode = null;
  this.exception = null;
  this.output = null;
  this.featureFile = null;
  this.featureFileName = null;
  this.featureFileHash = null;
  this.feature = null;
  this.workflowFile = null;
  this.workflow = null;
  this.countdown = -1;
  this.steps = null;
  this.metrics = null;
  this.inProgress = false;
  this.overallProgress = 0;
};

HistoryEntry.prototype.reset = function(orderNo, quantity, nc12)
{
  this.startedAt = Date.now();
  this.nc12 = nc12;
  this.serviceTag = null;
  this.log = [];

  if (orderNo === null)
  {
    this.order = null;
    this.counter = 0;
  }
  else if (this.order === null || !this.order.isSameOrder(orderNo, quantity))
  {
    this.order = new Order(this.startedAt, orderNo, quantity);
    this.counter = 0;

    this.log.push({
      time: this.startedAt,
      text: 'ORDER_CREATED',
      orderNo: this.order.no,
      quantity: this.order.quantity
    });
  }
  else
  {
    this.log.push({
      time: this.startedAt,
      text: 'ORDER_CONTINUED',
      orderNo: this.order.no,
      quantity: this.order.quantity,
      counter: this.counter + 1
    });
  }

  this.log.push({
    time: this.startedAt,
    text: 'PROGRAMMING_STARTED',
    nc12: this.nc12
  });

  this._id = (this.startedAt + Math.round(Math.random() * 9999999)).toString(36).toUpperCase();
  this.finishedAt = null;
  this.duration = null;
  this.result = null;
  this.errorCode = null;
  this.exception = null;
  this.output = null;
  this.featureFile = null;
  this.featureFileName = null;
  this.featureFileHash = null;
  this.feature = null;
  this.workflowFile = null;
  this.workflow = null;
  this.countdown = -1;
  this.steps = null;
  this.metrics = null;

  if (this.program)
  {
    this.steps = this.program.steps.map(function()
    {
      return {
        status: 'idle',
        progress: 0,
        value: 0
      };
    });
    this.metrics = {
      uSet: [],
      uGet: [],
      i: []
    };
  }

  this.inProgress = true;
  this.overallProgress = 1;
};

HistoryEntry.prototype.hashFeatureFile = function()
{
  this.featureFileHash = typeof this.feature === 'string'
    ? crypto.createHash('md5').update(this.feature, 'utf8').digest('hex')
    : null;

  return this.featureFileHash;
};

HistoryEntry.prototype.save = function(featureDbPath, done)
{
  var historyEntry = this;

  if (this.order)
  {
    this.order.save(this.db, this.broker, saveHistoryEntry);
  }
  else
  {
    saveHistoryEntry();
  }

  function saveHistoryEntry(err)
  {
    if (err)
    {
      return done(err);
    }

    if (historyEntry.featureFileHash === null)
    {
      return saveInDb(done);
    }

    return saveOnDisk(done);
  }

  function saveOnDisk(done)
  {
    var file = path.join(featureDbPath, historyEntry.featureFileHash);

    fs.writeFile(file, historyEntry.feature, {flag: 'wx'}, function(err)
    {
      if (err && err.code !== 'EEXIST')
      {
        return done(err);
      }

      return saveInDb(done);
    });
  }

  function saveInDb(done)
  {
    var sql = "\
      REPLACE INTO historyEntries (\
        _id, _order, nc12, counter, startedAt, finishedAt, duration,\
        log, result, errorCode, exception, output, featureFile,\
        featureFileName, featureFileHash, workflowFile, workflow,\
        program, steps, metrics, serviceTag\
      ) VALUES (\
        $_id, $_order, $nc12, $counter, $startedAt, $finishedAt, $duration,\
        $log, $result, $errorCode, $exception, $output, $featureFile,\
        $featureFileName, $featureFileHash, $workflowFile, $workflow,\
        $program, $steps, $metrics, $serviceTag\
      )";
    var params = {
      $_id: historyEntry._id,
      $_order: historyEntry.order ? historyEntry.order._id : null,
      $nc12: historyEntry.nc12,
      $counter: historyEntry.counter,
      $startedAt: historyEntry.startedAt,
      $finishedAt: historyEntry.finishedAt,
      $duration: historyEntry.duration,
      $log: JSON.stringify(historyEntry.log),
      $result: historyEntry.result,
      $errorCode: historyEntry.errorCode,
      $exception: historyEntry.exception,
      $output: historyEntry.output,
      $featureFile: historyEntry.featureFile,
      $featureFileName: historyEntry.featureFileName,
      $featureFileHash: historyEntry.featureFileHash,
      $workflowFile: historyEntry.workflowFile,
      $workflow: historyEntry.workflow,
      $program: historyEntry.program ? JSON.stringify(historyEntry.program) : null,
      $steps: historyEntry.steps ? JSON.stringify(historyEntry.steps) : null,
      $metrics: historyEntry.metrics ? JSON.stringify(historyEntry.metrics) : null,
      $serviceTag: historyEntry.serviceTag
    };

    historyEntry.db.run(sql, params, done);
  }
};
