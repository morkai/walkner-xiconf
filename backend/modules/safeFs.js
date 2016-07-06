// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');

exports.DEFAULT_CONFIG = {

};

exports.start = function startSafeFsModule(app, module)
{
  var pathToQueueMap = {};

  /**
   * @param {string} filePath
   * @param {(Buffer|string)} data
   * @param {object} [options]
   * @param {function((Error|null))} done
   */
  module.writeFile = function(filePath, data, options, done)
  {
    if (_.isFunction(options))
    {
      done = options;
      options = {};
    }

    var absolutePath = resolveAbsolutePath(filePath);

    queueOperation(absolutePath, writeFile, {
      path: absolutePath,
      data: data,
      options: options,
      callback: _.isFunction(done) ? done : _.noop
    });
  };

  /**
   * @param {string} filePath
   * @param {(string|object)} options
   * @param {string} [options.encoding]
   * @param {boolean} [options.backupIfEmpty]
   * @param {boolean} [options.backupIfBadByte]
   * @param {function((Error|null), (Buffer|string|null))} done
   */
  module.readFile = function(filePath, options, done)
  {
    if (!_.isFunction(done))
    {
      return;
    }

    if (_.isString(options))
    {
      options = {encoding: options};
    }

    var absolutePath = resolveAbsolutePath(filePath);

    queueOperation(absolutePath, readFile, _.defaults({
      path: absolutePath,
      callback: done
    }, options));
  };

  function resolveAbsolutePath(filePath)
  {
    if (path.isAbsolute(filePath))
    {
      return path.normalize(filePath);
    }

    return path.normalize(path.join(process.cwd(), filePath));
  }

  function queueOperation(path, operation, options)
  {
    if (!pathToQueueMap[path])
    {
      pathToQueueMap[path] = [operation, options];

      setImmediate(executeNextOperation, path);
    }
    else
    {
      pathToQueueMap[path].push(operation, options);
    }
  }

  function executeNextOperation(path)
  {
    var queue = pathToQueueMap[path];

    if (!_.isArray(queue))
    {
      return;
    }

    var operation = queue.shift();
    var options = queue.shift();

    if (!_.isFunction(operation))
    {
      delete pathToQueueMap[path];

      return;
    }

    operation(options, function()
    {
      setImmediate(executeNextOperation, path);
    });
  }

  function readFile(options, done)
  {
    fs.readFile(options.path, function(err, buffer)
    {
      if (err && err.code !== 'ENOENT')
      {
        options.callback(err, null);

        return done();
      }

      if (shouldTryBackupFile(options, buffer))
      {
        return readBackupFile(options, done);
      }

      var contents = _.isString(options.encoding) ? buffer.toString(options.encoding) : buffer;

      options.callback(null, contents);

      return done();
    });
  }

  function shouldTryBackupFile(options, buffer)
  {
    if (!buffer)
    {
      return true;
    }

    if (options.backupIfEmpty !== false && buffer.length === 0)
    {
      return true;
    }

    if (options.backupIfBadByte !== false && containsBadByte(buffer))
    {
      return true;
    }

    return false;
  }

  function containsBadByte(buffer)
  {
    if (buffer.length === 0)
    {
      return false;
    }

    var firstByte = buffer[0];

    return firstByte < 32 && firstByte !== 9 && firstByte !== 10 && firstByte !== 13;
  }

  function readBackupFile(options, done)
  {
    fs.readFile(options.path + '.backup', function(err, buffer)
    {
      if (err)
      {
        options.callback(err, null);

        return done();
      }

      var data = _.isString(options.encoding) ? buffer.toString(options.encoding) : buffer;

      options.callback(null, data);

      return done();
    });
  }

  function writeFile(options, done)
  {
    var backupPath = options.path + '.backup';

    fs.writeFile(backupPath, options.data, options.options, function(err)
    {
      if (err)
      {
        options.callback(err);

        return done();
      }

      fs.rename(backupPath, options.path, function(err)
      {
        options.callback(err || null);

        return done();
      });
    });
  }
};
