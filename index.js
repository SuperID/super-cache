/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var CacheManager = require('./lib/manager');
var MemoryStore = require('./lib/store/memory');


module.exports = exports = CacheManager;
exports.MemoryStore = MemoryStore;
