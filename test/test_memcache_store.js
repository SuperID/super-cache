/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var SuperCache = require('../');

describe('MemcacheStore', function () {

  var MAX = 5;
  var TTL = 1;
  var store = new SuperCache.MemcacheStore();


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


});
