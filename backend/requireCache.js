// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-wmes project <http://lukasz.walukiewicz.eu/p/walkner-wmes>

'use strict';

exports.built = false;
exports.cache = {};
exports.build = buildRequireCache;
exports.path = '';
exports.use = useRequireCache;
exports.save = saveRequireCacheToFile;

for (var i = 0, l = process.argv.length; i < l; ++i)
{
  var currentArg = process.argv[i];
  var nextArg = process.argv[i + 1];

  if (currentArg === '--cache-require' && nextArg)
  {
    exports.path = nextArg;
    exports.built = true;

    buildRequireCache();

    break;
  }

  if (currentArg === '--require-cache' && nextArg)
  {
    exports.path = nextArg;

    useRequireCache();

    break;
  }
}

function buildRequireCache()
{
  var Module = require('module');
  var originalRequire = Module.prototype.require;
  var requireCache = exports.cache;

  Module.prototype.require = function(request)
  {
    if (requireCache[this.id] === undefined)
    {
      requireCache[this.id] = {};
    }

    var resolvedRequest = Module._resolveFilename(request, this);

    if (resolvedRequest[0] === '/' || resolvedRequest[0] === '\\' || resolvedRequest[1] === ':')
    {
      requireCache[this.id][request] = resolvedRequest;
    }

    return originalRequire.call(this, request);
  };
}

function useRequireCache()
{
  var Module = require('module');
  var fs = require('fs');
  var originalResolveFilename = Module._resolveFilename;

  if (!exports.cache)
  {
    exports.cache = JSON.parse(fs.readFileSync(exports.path, 'utf8'));
  }

  var requireCache = exports.cache;

  Module._resolveFilename = function(request, parent)
  {
    var parentRequireMap = requireCache[parent.id];

    if (parentRequireMap !== undefined)
    {
      var resolvedRequest = parentRequireMap[request];

      if (resolvedRequest !== undefined)
      {
        return resolvedRequest;
      }
    }

    return originalResolveFilename(request, parent);
  };
}

function saveRequireCacheToFile(path)
{
  if (!path)
  {
    path = exports.path;
  }

  require('fs').writeFileSync(path, JSON.stringify(exports.cache), 'utf8');
}
