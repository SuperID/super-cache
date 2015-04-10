/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var debug = require('./debug')('call');


function CallQueue () {
  debug('create');
  this._keys = {};
}

CallQueue.prototype.isWaiting= function (name) {
  return !!this._keys[name];
};

CallQueue.prototype.wait = function (name, callback) {
  if (this._keys[name]) {
    debug('wait: queue=%s, name=%s', this._keys[name].length, name);
    this._keys[name].push(callback);
  } else {
    callback(new Error('queue is empty'));
  }
};

CallQueue.prototype.call = function (name, callback, getData) {
  var me = this;
  debug('call: name=%s', name);
  if (me._keys[name]) return callback(new Error('queue is not empty'));
  me._keys[name] = [callback];
  getData(function () {
    var args = Array.prototype.slice.call(arguments);
    me._queueCallback(name, args);
  });
};

CallQueue.prototype._queueCallback = function (name, args) {
  var list = this._keys[name];
  if (!list) throw new Error('queue is empty');
  debug('_queueCallback: queue=%s, name=%s, args=%j', list.length, name, args);
  for (var i = 0; i < list.length; i++) {
    list[i].apply(null, args);
  }
  delete this._keys[name];
};


module.exports = CallQueue;
