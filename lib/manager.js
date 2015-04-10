/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

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
    throw new Error('please specify a store engine');
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
  this._queue = {};
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

  if (callback) {
    if (me._queue[name]) {
      me._queue[name].push(callback);
    } else {
      me._queue[name] = [callback];
    }
  }

  me._store.get(name, function (err, data) {
    debug('_getCache callback: name=%s, err=%s, data=%j',name, err, data);
    me._queueCallback(name, err, data);
  });
};

CacheManager.prototype._queueCallback = function (name, err, data) {
  var me = this;
  if (me._queue[name]) {
    var list = me._queue[name];
    debug('_queueCallback: name=%s, length=%s, data=%j', name, list.length, data);
    for (var i = 0; i < list.length; i++) {
      list[i](err, data);
    }
    delete me._queue[name];
  }
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
