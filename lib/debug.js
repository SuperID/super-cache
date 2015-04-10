/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var debug = require('debug');

module.exports = function (name) {
  return debug('super-cache:' + name);
};
