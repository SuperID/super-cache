/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var path = require('path');
var should = require('should');
var async = require('async');
var SuperCache = require('../');

describe('options #notNull', function () {

  function generateTest (title, store) {

    var cache = new SuperCache({store: store});

    it(title + ' #1 not null value', function (done) {

      var VALUE = Math.random();
      var KEY = 'test-key-' + Math.random();

      cache.get(KEY, function (name, callback) {
        callback(null, VALUE);
      }, function (err, ret) {
        should.equal(err, null);
        should.equal(ret, VALUE);

        cache.get(KEY, function (name, callback) {
          callback(null, null);
        }, function (err, ret) {
          should.equal(err, null);
          should.equal(ret, VALUE);

          done();
        });
      });

    });

    it(title + ' #2 null value', function (done) {

      var VALUE = Math.random();
      var KEY = 'test-key-' + Math.random();

      cache.get(KEY, function (name, callback) {
        callback(null, null);
      }, function (err, ret) {
        should.equal(err, null);
        should.equal(ret, null);

        cache.get(KEY, function (name, callback) {
          callback(null, VALUE);
        }, function (err, ret) {
          should.equal(err, null);
          should.equal(ret, VALUE);
          done();
        });
      });

    });
  }

  generateTest('MemoryStore', new SuperCache.MemoryStore());
  generateTest('RedisStore', new SuperCache.RedisStore());
  generateTest('MemcacheStore', new SuperCache.MemcacheStore());
  generateTest('LocalStore', new SuperCache.LocalStore({
    type: 'local',
    prefix: 'cache_',
    path: path.resolve(__dirname, 'data'),
    max: 5,
    gcProbability: 0.5
  }));

});
