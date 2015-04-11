(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Super-Cache for Browser
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var CacheManager = require('./lib/manager');
var MemoryStore = require('./lib/store/memory');


module.exports = exports = CacheManager;
exports.MemoryStore = MemoryStore;

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

},{"./lib/manager":4,"./lib/store/memory":5}],2:[function(require,module,exports){
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

},{"debug":7}],4:[function(require,module,exports){
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

},{"./call":2,"./debug":3,"./store/memory":5}],5:[function(require,module,exports){
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
    var info = me._keys[name];
    debug('get: name=%s, exists=%s', name, !!info);
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
},{"../debug":3,"_process":6}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){

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

},{"./debug":8}],8:[function(require,module,exports){

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

},{"ms":9}],9:[function(require,module,exports){
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

},{}]},{},[1]);
