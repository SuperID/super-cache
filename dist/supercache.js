(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Super-Cache for Browser
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var CacheManager = require('./lib/manager');
var MemoryStore = require('./lib/store/memory');
var LocalStore = require('./lib/store/local');


module.exports = exports = CacheManager;
exports.MemoryStore = MemoryStore;
exports.LocalStore = LocalStore;

exports.create = function (options) {
  return new CacheManager(options);
};



// ADM mode
if (typeof define === 'function' && define.amd) {
  define(function () {
    return module.exports;
  });
}

// Shim mode
if (typeof window !== 'undefined') {
  window.SuperCache = module.exports;
}

},{"./lib/manager":4,"./lib/store/local":5,"./lib/store/memory":6}],2:[function(require,module,exports){
/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var debug = require('./debug')('call');


function CallQueue () {
  debug('create');
  this._keys = {};
}

CallQueue.prototype.isWaiting= function (name) {
  return !!this._keys[name];
};

CallQueue.prototype.wait = function (name, callback) {
  if (this._keys[name]) {
    debug('wait: queue=%s, name=%s', this._keys[name].length, name);
    this._keys[name].push(callback);
  } else {
    callback(new Error('queue is empty'));
  }
};

CallQueue.prototype.call = function (name, callback, getData) {
  var me = this;
  debug('call: name=%s', name);
  if (me._keys[name]) return callback(new Error('queue is not empty'));
  me._keys[name] = [callback];
  getData(function () {
    var args = Array.prototype.slice.call(arguments);
    me._queueCallback(name, args);
  });
};

CallQueue.prototype._queueCallback = function (name, args) {
  var list = this._keys[name];
  if (!list) throw new Error('queue is empty');
  debug('_queueCallback: queue=%s, name=%s, args=%j', list.length, name, args);
  for (var i = 0; i < list.length; i++) {
    list[i].apply(null, args);
  }
  delete this._keys[name];
};


module.exports = CallQueue;

},{"./debug":3}],3:[function(require,module,exports){
/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var debug = require('debug');

module.exports = function (name) {
  return debug('super-cache:' + name);
};

},{"debug":10}],4:[function(require,module,exports){
/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var CallQueue = require('./call');
var MemoryStore = require('./store/memory');
var debug = require('./debug')('manager');


var DEFAULT_TTL = 60;


/**
 * CacheManager
 *
 * @param {Object} options
 *   - {Object|String} store
 *   - {Number} ttl
 */
function CacheManager (options) {
  options = options || {};

  options.ttl = Number(options.ttl);
  if (isNaN(options.ttl)) options.ttl = DEFAULT_TTL;

  if (!options.store) {
    options.store = new MemoryStore();
  }
  if (typeof options.store === 'string') getDefaultStore(options.store);
  if (typeof options.store.get !== 'function') {
    throw new Error('store engine must implement `get` method');
  }
  if (typeof options.store.set !== 'function') {
    throw new Error('store engine must implement `set` method');
  }
  if (typeof options.store.delete !== 'function') {
    throw new Error('store engine must implement `delete` method');
  }

  debug('create: ttl=%s', options.ttl);
  this._ttl = options.ttl;
  this._store = options.store;

  this._keys = {};

  this._getMethodQueue = new CallQueue();
}

CacheManager.prototype._formatTtl = function (ttl) {
  ttl = Number(ttl);
  if (isNaN(ttl)) ttl = this._ttl;
  return ttl;
};

CacheManager.prototype._setCache = function (name, data, ttl, callback) {
  var me = this;
  ttl = me._formatTtl(ttl);
  debug('_setCache: name=%s, ttl=%s, data=%j', name, ttl, data);
  me._store.set(name, data, ttl, function (err) {
    debug('_setCache callback: name=%s, err=%s', name, err);
    if (callback) callback(err);
  });
};

CacheManager.prototype._deleteCache = function (name, callback) {
  var me = this;
  debug('_deleteCache: name=%s', name);
  me._store.delete(name, function (err) {
    debug('_deleteCache callback: name=%s', name);
    if (callback) callback(err);
  });
};

CacheManager.prototype._getCache = function (name, callback) {
  var me = this;
  debug('_getCache: name=%s', name);
  me._store.get(name, function (err, data) {
    debug('_getCache callback: name=%s, err=%s, data=%j',name, err, data);
    callback(err, data);
  });
};

/**
 * define
 *
 * @param {String} name
 * @param {Function} getData
 */
CacheManager.prototype.define = function (name, getData) {
  if (typeof getData !== 'function') {
    throw new Error('parameter `getData` must be a function');
  }
  this._keys[name] = getData;
  debug('define: name=%s', name);
};

/**
 * set
 *
 * @param {String} name
 * @param {Mixed} data
 * @param {Number} ttl
 * @param {Function} callback
 */
CacheManager.prototype.set = function (name, data, ttl, callback) {
  debug('set: name=%s, ttl=%s, data=%j', name, ttl, data);
  this._setCache(name, data, ttl, callback);
};

/**
 * get
 *
 * @param {String} name
 * @param {Function} getData
 * @param {Function} callback
 */
CacheManager.prototype.get = function (name, getData, callback) {
  var me = this;
  if (typeof callback !== 'function') {
    callback = getData;
    getData = false;
  }

  debug('get: name=%s getData=%s', name, !!getData);

  var queue = me._getMethodQueue;
  if (queue.isWaiting(name)) {
    queue.wait(name, callback);
  } else {
    queue.call(name, callback, function (callback) {
      me._get(name, getData, callback);
    });
  }
};

CacheManager.prototype._get = function (name, getData, callback) {
  var me = this;
  me._getCache(name, function (err, data) {
    if (err) return callback(err);

    if (typeof data !== 'undefined') return callback(null, data);

    if (!getData) {
      getData = function (name, callback) {
        var fn = me._keys[name];
        if (!fn) return callback(new Error('please define a function to get cache `' + name + '`'));
        fn(name, callback);
      };
    }

    getData(name, function (err, data, ttl) {
      if (err) return callback(err);

      me._setCache(name, data, ttl, function (err) {
        callback(err, data);
      });
    });
  });
};

/**
 * delete
 *
 * @param {String} name
 * @param {Function} callback
 */
CacheManager.prototype.delete = function (name, callback) {
  debug('delete: name=%s', name);
  this._deleteCache(name, callback);
};



module.exports = CacheManager;

},{"./call":2,"./debug":3,"./store/memory":6}],5:[function(require,module,exports){
(function (process){
/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var hasLocalStorage = require('has-localstorage');
var LocalStorage = require('node-localstorage').LocalStorage;
var debug = require('../debug')('LocalStore');


debug('hasLocalStorage=%s', hasLocalStorage());


var DEFAULT_TYPE = 'local';
var DEFAULT_PREFIX = 'cache_';
var DEFAULT_PATH = './data';
var DEFAULT_MAX = 1000;
var DEFAULT_PROBABILITY = 0.01;


function getStorage (type, dir) {
  type = type.toLowerCase();
  if (type === 'local') {
    return hasLocalStorage() ? localStorage : new LocalStorage(dir);
  } else if (type === 'session') {
    return hasLocalStorage() ? sessionStorage : new LocalStorage(dir);
  } else {
    throw new Error('unsupport storage type `' + type + '`');
  }
}


/**
 * LocalStore
 *
 * @param {Object} options
 *   - {Number} max
 *   - {Number} gcProbability
 */
function LocalStore (options) {
  options = options || {};

  options.max = Number(options.max);
  if (isNaN(options.max)) options.max = DEFAULT_MAX;
  this._max = options.max;

  options.gcProbability = Number(options.gcProbability);
  if (isNaN(options.gcProbability)) options.gcProbability = DEFAULT_PROBABILITY;
  this._gcProbability = options.gcProbability;

  options.path = options.path || DEFAULT_PATH;
  this._path = options.path;

  options.type = options.type || DEFAULT_TYPE;
  this._type = options.type;
  this._storage = getStorage(this._type, this._path);

  options.prefix = options.prefix || DEFAULT_PREFIX;
  this._prefix = options.prefix;

  debug('init: type=%s, prefix=%s, path=%s, max=%s, gcProbability=%s', this._type, this._prefix, this._path, this._max, this._gcProbability);

  this._setKeyTotal(this._itemLength());
  debug('keyTotal=%s', this._getKeyTotal());
}

LocalStore.prototype._getItem = function (name) {
  var json = this._storage.getItem(this._prefix + name);
  if (!json) return;
  try {
    return JSON.parse(json);
  } catch (err) {
    debug('_getItem error: %s', err);
  }
};

LocalStore.prototype._setItem = function (name, value) {
  var json = JSON.stringify(value);
  this._storage.setItem(this._prefix + name, json);
};

LocalStore.prototype._removeItem = function (name) {
  this._storage.removeItem(this._prefix + name);
};

LocalStore.prototype._forEachItem = function (fn) {
  var storage = this._storage;
  var prefix = this._prefix;
  var len = storage.length;
  for (var i = 0; i < len; i++) {
    var key = storage.key(i);
    if (key.substr(0, prefix.length) === prefix) {
      fn(this._getItem(key.slice(prefix.length)), key);
    }
  }
};

LocalStore.prototype._getKeyTotal = function () {
  var n = Number(this._storage.getItem('$$' + this._prefix + '_key_total'));
  if (isNaN(n)) n = 0;
  return n;
};

LocalStore.prototype._setKeyTotal = function (n) {
  this._storage.setItem('$$' + this._prefix + '_key_total', n);
};

LocalStore.prototype._itemLength = function () {
  var storage = this._storage;
  var prefix = this._prefix;
  var len = storage.length;
  var ret = 0;
  for (var i = 0; i < len; i++) {
    var key = storage.key(i);
    if (key.substr(0, prefix.length) === prefix) {
      ret++;
    }
  }
  return ret;
};

LocalStore.prototype.get = function (name, callback) {
  var me = this;
  process.nextTick(function () {
    var t = Date.now();
    var info = me._getItem(name);
    debug('get: name=%s, exists=%s', name, !!info);
    if (info && info.expire < t) {
      info = undefined;
      me._removeItem(name);
    }
    callback(null, info && info.data);
  });

  if (this._isGCProbability()) this._gc();
};

LocalStore.prototype.set = function (name, data, ttl, callback) {
  var me = this;
  me._setItem(name, {
    name: name,
    data: data,
    expire: Date.now() + ttl * 1000
  });
  debug('set: name=%s, ttl=%s, data=%j', name, ttl, data);
  if (me._getKeyTotal() > me._max) {
    me._gc();
  }
  process.nextTick(function () {
    callback(null);
  });
};

LocalStore.prototype.delete = function (name, callback) {
  var me = this;
  debug('delete: name=%s', name);
  me._removeItem(name);
  me._setKeyTotal(me._getKeyTotal() - 1);
  process.nextTick(function () {
    callback(null);
  });
};

LocalStore.prototype._isGCProbability = function () {
  return ((1 / this._gcProbability) * Math.random() <= 1);
};

LocalStore.prototype._gc = function () {
  var me = this;
  var prefix = me._prefix;

  var keys = {};
  var keyTotal = 0;
  me._forEachItem(function (item, name) {
    keys[name] = item;
    keyTotal++;
  });

  debug('_gc: total=%s', keyTotal);

  var t = Date.now();
  for (var i in keys) {
    if (keys[i].expire < t) {
      debug('_gc delete: key=%s, expire=%s [expired]', i, keys[i].expire);
      delete keys[i];
      me._removeItem(i.slice(prefix.length));
      keyTotal--;
    }
  }

  if (keyTotal > me._max) {
    var list = Object.keys(keys).map(function (k) {
      return keys[k];
    });
    list.sort(function (a, b) {
      return a.expire - b.expire;
    });
    var deleteList = list.slice(0, keyTotal - me._max);
    deleteList.forEach(function (item) {
      debug('_gc delete: key=%s, expire=%s [store full]', item.name, item.expire);
      delete keys[item.name];
      me._removeItem(item.name);
      keyTotal--;
    });
  }

  me._setKeyTotal(me._itemLength());
  debug('keyTotal=%s', me._getKeyTotal());
};

module.exports = LocalStore;

}).call(this,require('_process'))
},{"../debug":3,"_process":9,"has-localstorage":13,"node-localstorage":14}],6:[function(require,module,exports){
(function (process){
/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var debug = require('../debug')('MemoryStore');


var DEFAULT_MAX = 1000;
var DEFAULT_PROBABILITY = 0.01;


/**
 * MemoryStore
 *
 * @param {Object} options
 *   - {Number} max
 *   - {Number} gcProbability
 */
function MemoryStore (options) {
  options = options || {};

  options.max = Number(options.max);
  if (isNaN(options.max)) options.max = DEFAULT_MAX;
  this._max = options.max;

  options.gcProbability = Number(options.gcProbability);
  if (isNaN(options.gcProbability)) options.gcProbability = DEFAULT_PROBABILITY;
  this._gcProbability = options.gcProbability;

  debug('init: max=%s, gcProbability=%s', this._max, this._gcProbability);

  this._keys = {};
  this._keyTotal = 0;
}

MemoryStore.prototype.get = function (name, callback) {
  var me = this;
  process.nextTick(function () {
    var t = Date.now();
    var info = me._keys[name];
    debug('get: name=%s, exists=%s', name, !!info);
    if (info && info.expire < t) {
      info = undefined;
      delete me._keys[name];
      me._keyTotal--;
    }
    callback(null, info && info.data);
  });

  if (this._isGCProbability()) this._gc();
};

MemoryStore.prototype.set = function (name, data, ttl, callback) {
  var me = this;
  if (!me._keys[name]) me._keyTotal++;
  me._keys[name] = {
    name: name,
    data: data,
    expire: Date.now() + ttl * 1000
  };
  if (me._keyTotal > me._max) {
    me._gc();
  }
  debug('set: name=%s, ttl=%s, data=%j', name, ttl, data);
  process.nextTick(function () {
    callback(null);
  });
};

MemoryStore.prototype.delete = function (name, callback) {
  var me = this;
  debug('delete: name=%s', name);
  if (me._keys[name]) {
    delete me._keys[name];
    me._keyTotal--;
  }
  process.nextTick(function () {
    callback(null);
  });
};

MemoryStore.prototype._isGCProbability = function () {
  return ((1 / this._gcProbability) * Math.random() <= 1);
};

MemoryStore.prototype._gc = function () {
  var me = this;
  debug('_gc: total=%s', me._keyTotal);
  var keys = me._keys;

  var t = Date.now();
  for (var i in keys) {
    if (keys[i].expire < t) {
      debug('_gc delete: key=%s, expire=%s [expired]', i, keys[i].expire);
      delete keys[i];
      me._keyTotal--;
    }
  }

  if (me._keyTotal > me._max) {
    var list = Object.keys(keys).map(function (k) {
      return keys[k];
    });
    list.sort(function (a, b) {
      return a.expire - b.expire;
    });
    var deleteList = list.slice(0, me._keyTotal - me._max);
    deleteList.forEach(function (item) {
      debug('_gc delete: key=%s, expire=%s [store full]', item.name, item.expire);
      delete keys[item.name];
      me._keyTotal--;
    });
  }
};

module.exports = MemoryStore;

}).call(this,require('_process'))
},{"../debug":3,"_process":9}],7:[function(require,module,exports){

},{}],8:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":9}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Use chrome.storage.local if we are in an app
 */

var storage;

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined')
  storage = chrome.storage.local;
else
  storage = localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      storage.removeItem('debug');
    } else {
      storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":11}],11:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":12}],12:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],13:[function(require,module,exports){
/**
 * # hasLocalStorage()
 *
 * returns `true` or `false` depending on whether localStorage is supported or not.
 * Beware that some browsers like Safari do not support localStorage in private mode.
 *
 * inspired by this cappuccino commit
 * https://github.com/cappuccino/cappuccino/commit/063b05d9643c35b303568a28809e4eb3224f71ec
 *
 * @returns {Boolean}
 */
function hasLocalStorage() {
  try {

    // we've to put this in here. I've seen Firefox throwing `Security error: 1000`
    // when cookies have been disabled
    if (typeof localStorage === 'undefined') {
      return false;
    }

    // Just because localStorage exists does not mean it works. In particular it might be disabled
    // as it is when Safari's private browsing mode is active.
    localStorage.setItem('Storage-Test', '1');

    // that should not happen ...
    if (localStorage.getItem('Storage-Test') !== '1') {
      return false;
    }

    // okay, let's clean up if we got here.
    localStorage.removeItem('Storage-Test');
  } catch (_error) {

    // in case of an error, like Safari's Private Mode, return false
    return false;
  }

  // we're good.
  return true;
}


if (typeof exports === 'object') {
  module.exports = hasLocalStorage;
}

},{}],14:[function(require,module,exports){
// Generated by CoffeeScript 1.9.0
(function() {
  var JSONStorage, LocalStorage, QUOTA_EXCEEDED_ERR, fs, path, _emptyDirectory, _rm,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __hasProp = {}.hasOwnProperty;

  path = require('path');

  fs = require('fs');

  _emptyDirectory = function(target) {
    var p, _i, _len, _ref, _results;
    _ref = fs.readdirSync(target);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      _results.push(_rm(path.join(target, p)));
    }
    return _results;
  };

  _rm = function(target) {
    if (fs.statSync(target).isDirectory()) {
      _emptyDirectory(target);
      return fs.rmdirSync(target);
    } else {
      return fs.unlinkSync(target);
    }
  };

  QUOTA_EXCEEDED_ERR = (function(_super) {
    __extends(QUOTA_EXCEEDED_ERR, _super);

    function QUOTA_EXCEEDED_ERR(_at_message) {
      this.message = _at_message != null ? _at_message : 'Unknown error.';
      if (Error.captureStackTrace != null) {
        Error.captureStackTrace(this, this.constructor);
      }
      this.name = this.constructor.name;
    }

    QUOTA_EXCEEDED_ERR.prototype.toString = function() {
      return this.name + ": " + this.message;
    };

    return QUOTA_EXCEEDED_ERR;

  })(Error);

  LocalStorage = (function() {
    function LocalStorage(_at_location, _at_quota) {
      this.location = _at_location;
      this.quota = _at_quota != null ? _at_quota : 5 * 1024 * 1024;
      if (!(this instanceof LocalStorage)) {
        return new LocalStorage(this.location, this.quota);
      }
      this.length = 0;
      this.bytesInUse = 0;
      this.keys = [];
      this._init();
      this.QUOTA_EXCEEDED_ERR = QUOTA_EXCEEDED_ERR;
    }

    LocalStorage.prototype._init = function() {
      var k, value, _i, _len, _ref, _results;
      if (fs.existsSync(this.location)) {
        if (!fs.statSync(this.location).isDirectory()) {
          throw new Error("A file exists at the location '" + this.location + "' when trying to create/open localStorage");
        }
      }
      if (!fs.existsSync(this.location)) {
        fs.mkdirSync(this.location);
      }
      this.keys = fs.readdirSync(this.location).map(decodeURIComponent);
      this.length = this.keys.length;
      this.bytesInUse = 0;
      _ref = this.keys;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        value = this.getStat(k);
        if ((value != null ? value.size : void 0) != null) {
          _results.push(this.bytesInUse += value.size);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    LocalStorage.prototype.setItem = function(key, value) {
      var existsBeforeSet, filename, oldLength, valueString, valueStringLength;
      key = key.toString();
      filename = path.join(this.location, encodeURIComponent(key));
      existsBeforeSet = fs.existsSync(filename);
      valueString = value.toString();
      valueStringLength = valueString.length;
      if (existsBeforeSet) {
        oldLength = this.getStat(key).size;
      } else {
        oldLength = 0;
      }
      if (this.bytesInUse - oldLength + valueStringLength > this.quota) {
        throw new QUOTA_EXCEEDED_ERR();
      }
      fs.writeFileSync(filename, valueString, 'utf8');
      if (!existsBeforeSet) {
        this.keys.push(key);
        this.length = this.keys.length;
        return this.bytesInUse += valueStringLength;
      }
    };

    LocalStorage.prototype.getItem = function(key) {
      var filename;
      key = key.toString();
      filename = path.join(this.location, encodeURIComponent(key));
      if (fs.existsSync(filename)) {
        return fs.readFileSync(filename, 'utf8');
      } else {
        return null;
      }
    };

    LocalStorage.prototype.getStat = function(key) {
      var filename;
      key = key.toString();
      filename = path.join(this.location, encodeURIComponent(key));
      if (fs.existsSync(filename)) {
        return fs.statSync(filename, 'utf8');
      } else {
        return null;
      }
    };

    LocalStorage.prototype.removeItem = function(key) {
      var filename;
      key = key.toString();
      filename = path.join(this.location, encodeURIComponent(key));
      if (fs.existsSync(filename)) {
        _rm(filename);
      }
      return this._init();
    };

    LocalStorage.prototype.key = function(n) {
      return this.keys[n];
    };

    LocalStorage.prototype.clear = function() {
      _emptyDirectory(this.location);
      this.keys = [];
      this.length = 0;
      return this.bytesInUse = 0;
    };

    LocalStorage.prototype.getBytesInUse = function() {
      return this.bytesInUse;
    };

    LocalStorage.prototype._deleteLocation = function() {
      _rm(this.location);
      this.keys = [];
      this.length = 0;
      return this.bytesInUse = 0;
    };

    return LocalStorage;

  })();

  JSONStorage = (function(_super) {
    __extends(JSONStorage, _super);

    function JSONStorage() {
      return JSONStorage.__super__.constructor.apply(this, arguments);
    }

    JSONStorage.prototype.setItem = function(key, value) {
      var newValue;
      newValue = JSON.stringify(value);
      return JSONStorage.__super__.setItem.call(this, key, newValue);
    };

    JSONStorage.prototype.getItem = function(key) {
      return JSON.parse(JSONStorage.__super__.getItem.call(this, key));
    };

    return JSONStorage;

  })(LocalStorage);

  exports.LocalStorage = LocalStorage;

  exports.JSONStorage = JSONStorage;

  exports.QUOTA_EXCEEDED_ERR = QUOTA_EXCEEDED_ERR;

}).call(this);

},{"fs":7,"path":8}]},{},[1]);
