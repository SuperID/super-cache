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

  return this;
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
