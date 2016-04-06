/**
 * Super-Cache for Node.js
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var CacheManager = require('./lib/manager');
var MemoryStore = require('./lib/store/memory');
var LocalStore = require('./lib/store/local');
var MemcacheStore = require('./lib/store/memcache');
var RedisStore = require('./lib/store/redis');

LocalStore.$LocalStorage = require('node-localstorage').LocalStorage;

module.exports = exports = CacheManager;
exports.MemoryStore = MemoryStore;
exports.LocalStore = LocalStore;
exports.MemcacheStore = MemcacheStore;
exports.RedisStore = RedisStore;

exports.create = function (options) {
  return new CacheManager(options);
};
