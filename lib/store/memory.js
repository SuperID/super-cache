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
