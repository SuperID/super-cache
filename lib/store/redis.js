/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var Redis = require('ioRedis');
var debug = require('../debug')('RedisStore');


/**
 * RedisStore
 *
 * @param {Object} options
 *   - {String} host
 *   - {String} port
 *   - {String} prefix
 */
function RedisStore (options) {
  options = options || {};
  this._host = options.host || '127.0.0.1';
  this._port = options.port || 6379;
  this._db = options.db || 0;
  this._prefix = options.prefix || '';

  debug('create: host=%s, port=%s, db=%s, prefix=%s', this._host, this._port, this._db, this._prefix);

  // 兼容旧的redis模块配置
  options.password = options.password || options.auth_pass;

  this._client = new  Redis(options);
}

RedisStore.prototype._getKey = function (name) {
  return this._prefix + name;
};

RedisStore.prototype._parseJSON = function (json) {
  var data;
  try {
    data = JSON.parse(json);
  } catch (err) {
    debug('_parseJSON error: json=%s, error=%s', json, err);
  }
  return data;
};

RedisStore.prototype._jsonStringify = function (data) {
  var json;
  try {
    json = JSON.stringify(data);
  } catch (err) {
    debug('_jsonStringify error: data=%j, error=%s', data, err);
    json = 'null';
  }
  return json;
};

RedisStore.prototype.get = function (name, callback) {
  var me = this;
  var key = me._getKey(name);
  debug('get: name=%s, key=%s', name, key);
  me._client.get(key, function (err, ret) {
    debug('get callback: name=%s, err=%s, ret=%s', name, err, ret);
    if (err) return callback(err);
    if (!ret) ret = '';
    var data = me._parseJSON(ret);
    callback(null, data);
  });
};

RedisStore.prototype.set = function (name, data, ttl, callback) {
  var me = this;
  var key = me._getKey(name);
  var json = me._jsonStringify(data);
  debug('set: name=%s, key=%s, ttl=%s, data=%j, json=%s', name, key, ttl, data, json);
  me._client.setex(key, ttl, json, function (err, ret) {
    debug('set callback: name=%s, err=%s, ret=%s', name, err, ret);
    callback(err);
  });
};

RedisStore.prototype.delete = function (name, callback) {
  var me = this;
  var key = me._getKey(name);
  debug('delete: name=%s, key=%s', name, key);
  me._client.del(key, function (err, ret) {
    debug('delete callback: name=%s, err=%s, ret=%s', name, err, ret);
    callback(err);
  });
};


module.exports = RedisStore;
