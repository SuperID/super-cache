/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var SuperCache = require('../');

describe('options #notNull', function () {

  function generateTest (title, store) {
    it('notNull=false, store=' + title, function (done) {

      var cache = new SuperCache({store: store});
      var VALUE = Math.random();

      cache.get('key', function (name, callback) {
        callback(null, null);
      }, function (err, ret) {
        should.equal(err, null);
        should.equal(ret, null);

        cache.get('key', function (name, callback) {
          callback(null, VALUE);
        }, function (err, ret) {
          should.equal(err, null);
          should.equal(ret, null);
          done();
        });
      });

    });

    it('notNull=true, store=' + title, function (done) {

      var cache = new SuperCache({store: store});
      var VALUE = Math.random();

      cache.get('key', function (name, callback) {
        callback(null, null, {notNull: true});
      }, function (err, ret) {
        should.equal(err, null);
        should.equal(ret, null);

        cache.get('key', function (name, callback) {
          console.log(name, VALUE);
          callback(null, VALUE, {notNull: true});
        }, function (err, ret) {
          should.equal(err, null);
          should.equal(ret, VALUE);
          done();
        });
      });

    });
  }

  generateTest('MemoryStore', SuperCache.MemoryStore());
  generateTest('RedisStore', SuperCache.RedisStore());
  generateTest('MemcacheStore', SuperCache.MemcacheStore());


});
