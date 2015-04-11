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
