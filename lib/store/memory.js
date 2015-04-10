/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var debug = require('../debug')('MemoryStore');


var DEFAULT_MAX = 100;


function MemoryStore (max) {
  max = Number(max);
  if (isNaN(max)) max = DEFAULT_MAX;
  debug('init: max=%s', max);
  this._max = max;
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
};

MemoryStore.prototype.set = function (name, data, ttl, callback) {
  var me = this;
  if (!me._keys[name]) me._keyTotal++;
  me._keys[name] = {
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

MemoryStore.prototype._gc = function () {
  debug('_gc: total=%s', this._keyTotal);
  var keys = this._keys;
  var t = Date.now();
  for (var i in keys) {
    if (keys[i].expire < t) {
      debug('_gc delete: key=%s, expire=%s', i, keys[i].expire);
      delete keys[i];
      this._keyTotal--;
    }
  }
};

module.exports = MemoryStore;
