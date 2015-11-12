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

    getData(name, function (err, data, options) {
      if (err) return callback(err);

      if (typeof options === 'number') {
        options = {ttl: options};
      } else {
        options = options || {};
      }

      if (options.notNull && (data === undefined || data === null)) {
        return callback(null, data);
      }

      me._setCache(name, data, options.ttl, function (err) {
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
