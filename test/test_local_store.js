/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var path = require('path');
var should = require('should');
var async = require('async');
var SuperCache = require('../');

describe('LocalStore', function () {

  var MAX = 5;
  var TTL = 1;
  var store = new SuperCache.LocalStore({
    type: 'local',
    prefix: 'cache_' + Math.random(),
    path: path.resolve(__dirname, 'data'),
    max: MAX,
    gcProbability: 0.5
  });


  it('get(name, callback) & set(name, data, ttl, callback) & del(name, callback)', function (done) {

    var VALUE_1 = Math.random();
    var VALUE_2 = Math.random();

    async.series([
      function (next) {
        store.set('key1', VALUE_1, TTL, function (err) {
          should.equal(err, null);
          next();
        });
      },
      function (next) {
        store.set('key2', VALUE_2, TTL, function (err) {
          should.equal(err, null);
          next();
        });
      },
      function (next) {
        store.get('key1', function (err, ret) {
          should.equal(err, null);
          ret.should.equal(VALUE_1);
          next();
        });
      },
      function (next) {
        store.get('key2', function (err, ret) {
          should.equal(err, null);
          ret.should.equal(VALUE_2);
          next();
        });
      },
      function (next) {
        store.get('key2_2', function (err, ret) {
          should.equal(err, null);
          should.not.exists(ret);
          next();
        });
      },
      function (next) {
        store.delete('key2', function (err) {
          should.equal(err, null);
          next();
        });
      },
      function (next) {
        store.get('key2', function (err, ret) {
          should.equal(err, null);
          should.not.exists(ret);
          next();
        });
      },
      function (next) {
        store.get('key1', function (err, ret) {
          should.equal(err, null);
          ret.should.equal(VALUE_1);
          next();
        });
      }
    ], done);

  });


  it('store full, auto delete keys', function (done) {

    async.times(20, function (i, next) {
      store.set('random-key-' + i, Math.random(), TTL, function (err) {
        should.equal(err, null);
        next();
      });
    }, function (err) {
      should.equal(err, null);

      store._gc();
      store._itemLength().should.equal(MAX);

      done();

    });


  });


  it('auto delete expired key', function (done) {

    var TTL_2 = TTL * 0.5;
    var VALUE_3 = Math.random();
    var VALUE_4 = Math.random();
    var VALUE_5 = Math.random();

    async.series([
      function (next) {
        setTimeout(next, TTL * 1100);
      },
      function (next) {
        store.set('key3', VALUE_3, TTL_2, function (err) {
          should.equal(err, null);
          next();
        });
      },
      function (next) {
        store.set('key4', VALUE_4, TTL_2, function (err) {
          should.equal(err, null);
          next();
        });
      },
      function (next) {
        store.set('key5', VALUE_5, TTL, function (err) {
          should.equal(err, null);
          next();
        });
      },
      function (next) {
        store.get('key3', function (err, ret) {
          should.equal(err, null);
          ret.should.equal(VALUE_3);
          next();
        });
      },
      function (next) {
        store.get('key4', function (err, ret) {
          should.equal(err, null);
          ret.should.equal(VALUE_4);
          next();
        });
      },
      function (next) {
        store.get('key5', function (err, ret) {
          should.equal(err, null);
          ret.should.equal(VALUE_5);
          next();
        });
      },
      function (next) {
        setTimeout(function () {
          store._gc();
          next();
        }, TTL_2 * 1100);
      },
      function (next) {
        store.get('key3', function (err, ret) {
          should.equal(err, null);
          should.not.exists(ret);
          next();
        });
      },
      function (next) {
        store.get('key4', function (err, ret) {
          should.equal(err, null);
          should.not.exists(ret);
          next();
        });
      },
      function (next) {
        store.get('key5', function (err, ret) {
          should.equal(err, null);
          ret.should.equal(VALUE_5);
          next();
        });
      },
      function (next) {
        setTimeout(function () {
          store._gc();
          next();
        }, TTL_2 * 1100);
      },
      function (next) {
        store.get('key5', function (err, ret) {
          should.equal(err, null);
          should.not.exists(ret);
          next();
        });
      }
    ], done);

  });


});
