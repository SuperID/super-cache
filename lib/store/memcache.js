/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var memjs = require('memjs');
var debug = require('../debug')('MemcacheStore');


/**
 * MemcacheStore
 *
 * @param {Object} options
 *   - {String} host
 *   - {String} port
 *   - {String} prefix
 *   - {String} user
 *   - {String} password
 *   - {Number} pool
 */
function MemcacheStore (options) {
  options = options || {};
  this._host = options.host || '127.0.0.1';
  this._port = options.port || 11211;
  this._prefix = options.prefix || '';
  this._user = options.user || '';
  this._password = options.password || '';
  this._pool = options.pool = (options.pool > 1 ? options.pool : 1);
  this._connectionString = this._user + ':' + this._password + '@' + this._host + ':' + this._port;

  debug('create: host=%s, port=%s, prefix=%s, user=%s, password=%s', this._host, this._port, this._prefix, this._user, this._password);

  this._clients = [];
  this._clientIndex = -1;
  for (var i = 0; i < options.pool; i++) {
    this._clients.push(memjs.Client.create(this._connectionString));
  }

  return this;
}

MemcacheStore.prototype._getClient = function () {
  this._clientIndex++;
  if (this._clientIndex >= this._clients.length) {
    this._clientIndex = 0;
  }
  return this._clients[this._clientIndex];
};

MemcacheStore.prototype._getKey = function (name) {
  return this._prefix + name;
};

MemcacheStore.prototype._parseJSON = function (json) {
  if (typeof json !== 'string') return null;
  var data;
  try {
    data = JSON.parse(json);
  } catch (err) {
    debug('_parseJSON error: json=%s, error=%s', json, err);
  }
  return data;
};

MemcacheStore.prototype._jsonStringify = function (data) {
  var json;
  try {
    json = JSON.stringify(data) || 'null';
  } catch (err) {
    debug('_jsonStringify error: data=%j, error=%s', data, err);
    json = 'null';
  }
  return json;
};

MemcacheStore.prototype.get = function (name, callback) {
  var me = this;
  var key = me._getKey(name);
  debug('get: name=%s, key=%s', name, key);
  me._getClient().get(key, function (err, ret) {
    debug('get callback: name=%s, err=%s, ret=%s', name, err, ret);
    if (err) return callback(err);
    var data = me._parseJSON(ret && ret.toString());
    callback(null, data);
  });
};

MemcacheStore.prototype.set = function (name, data, ttl, callback) {
  var me = this;
  var key = me._getKey(name);
  var json = me._jsonStringify(data);
  debug('set: name=%s, key=%s, ttl=%s, data=%j, json=%s', name, key, ttl, data, json);
  me._getClient().set(key, json, function (err, ret) {
    debug('set callback: name=%s, err=%s, ret=%s', name, err, ret);
    callback(err);
  }, ttl);
};

MemcacheStore.prototype.delete = function (name, callback) {
  var me = this;
  var key = me._getKey(name);
  debug('delete: name=%s, key=%s', name, key);
  me._getClient().delete(key, function (err, ret) {
    debug('delete callback: name=%s, err=%s, ret=%s', name, err, ret);
    callback(err);
  });
};


module.exports = MemcacheStore;
