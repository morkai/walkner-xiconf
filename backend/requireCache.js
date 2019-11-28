// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

const Module = require('module');
const fs = require('fs');
const path = require('path');

const originalRequire = Module.prototype.require;
const originalResolveFilename = Module._resolveFilename;
const originalJsHandler = Module._extensions['.js'];
const originalJsonHandler = Module._extensions['.json'];

exports.root = path.join(__dirname, '..').replace(/\\/g, '/') + '/';
exports.built = false;
exports.cache = {
  paths: {},
  sources: {}
};
exports.build = buildRequireCache;
exports.path = '';
exports.use = useRequireCache;
exports.save = saveRequireCacheToFile;
exports.reset = resetRequireCache;

for (var i = 0, l = process.argv.length; i < l; ++i)
{
  const currentArg = process.argv[i];
  const nextArg = process.argv[i + 1];

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

function resetRequireCache()
{
  exports.cache = {
    paths: {},
    sources: {}
  };

  Module.prototype.require = originalRequire;
  Module._resolveFilename = originalResolveFilename;
  Module._extensions['.js'] = originalJsHandler;
  Module._extensions['.json'] = originalJsonHandler;
}

function makeRelative(absolute)
{
  return absolute.replace(/\\/g, '/').replace(exports.root, '');
}

function isAbsolute(path)
{
  return path[0] === '/' || path[0] === '\\' || path[1] === ':';
}

function buildRequireCache()
{
  const Module = require('module');
  const requireCache = exports.cache.paths;

  Module.prototype.require = function(request)
  {
    if (!this.idRel)
    {
      this.idRel = makeRelative(this.id);
    }

    if (requireCache[this.idRel] === undefined)
    {
      requireCache[this.idRel] = {};
    }

    var resolvedRequest = Module._resolveFilename(request, this);

    if (isAbsolute(resolvedRequest))
    {
      requireCache[this.idRel][isAbsolute(request) ? makeRelative(request) : request] = makeRelative(resolvedRequest);
    }

    return originalRequire.call(this, request);
  };
}

function useRequireCache()
{
  if (!exports.cache)
  {
    exports.cache = JSON.parse(fs.readFileSync(exports.path, 'utf8'));
  }

  const requireCache = exports.cache;

  Module._resolveFilename = function(request, parent)
  {
    if (!parent.idRel)
    {
      parent.idRel = makeRelative(parent.id);
    }

    const parentRequireMap = requireCache.paths[parent.idRel];

    if (parentRequireMap !== undefined)
    {
      let resolvedRequest = parentRequireMap[request];

      if (resolvedRequest === undefined && isAbsolute(request))
      {
        resolvedRequest = parentRequireMap[makeRelative(request)];
      }

      if (resolvedRequest !== undefined)
      {
        return exports.root + resolvedRequest;
      }
    }

    return originalResolveFilename(request, parent);
  };

  Module._extensions['.js'] = function(module, filename)
  {
    const relativeFilename = makeRelative(filename);
    const source = requireCache.sources[relativeFilename];

    if (source === undefined)
    {
      return originalJsHandler(module, filename);
    }

    return module._compile(source, filename);
  };

  Module._extensions['.json'] = function(module, filename)
  {
    const relativeFilename = makeRelative(filename);
    const json = requireCache.sources[relativeFilename];

    if (json === undefined)
    {
      return originalJsonHandler(module, filename);
    }

    module.exports = json;
  };
}

function saveRequireCacheToFile(path)
{
  if (!path)
  {
    path = exports.path;
  }

  const requireCache = exports.cache;

  resetRequireCache();

  loadSources(requireCache);

  require('fs').writeFileSync(path, JSON.stringify(requireCache, null, 0), 'utf8');
}

function loadSources(requireCache)
{
  Object.keys(requireCache.paths).forEach(function(path)
  {
    loadSource(requireCache.sources, path);

    var modules = requireCache.paths[path];

    Object.keys(modules).forEach(function(module)
    {
      loadSource(requireCache.sources, modules[module]);
    });
  });
}

function loadSource(sources, path)
{
  if (!/\.js(on)?$/.test(path) || sources[path] !== undefined)
  {
    return;
  }

  const source = fs.readFileSync(exports.root + path, 'utf8');
  let minified = null;

  if (/\.json$/.test(path))
  {
    minified = JSON.parse(source);
  }
  else
  {
    try
    {
      minified = require('uglify-js').minify(source, {
        compress: {
          hoist_funs: false, // eslint-disable-line camelcase
          hoist_vars: false // eslint-disable-line camelcase
        }
      }).code;
    }
    catch (err)
    {
      console.log('[requireCache] %s: %s', path, err.message);
    }
  }

  sources[path] = minified || source;
}
