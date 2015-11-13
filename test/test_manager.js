/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var path = require('path');
var should = require('should');
var async = require('async');
var SuperCache = require('../');

describe('CacheManager', function () {

  function generateTest (title, store) {

    var cache = new SuperCache({store: store});
    var KEY = 'test-key-' + Math.random();

    it('#' + title + ' define(name, getData) & get(name, callback)', function (done) {

      var VALUE_1 = Math.random();
      var VALUE_2 = Math.random();

      cache.define(KEY + '1', function (name, calback) {
        name.should.equal(KEY + '1');
        calback(null, VALUE_1);
      });

      cache.define(KEY + '2', function (name, calback) {
        name.should.equal(KEY + '2');
        calback(null, VALUE_2);
      });

      cache.get(KEY + '1', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_1);

        cache.get(KEY + '2', function (err, ret) {
          should.equal(err, null);
          ret.should.be.equal(VALUE_2);

          cache.get(KEY + '3', function (err, ret) {
            should.exists(err);

            done();
          });
        });
      });

    });


    it('#' + title + ' get(name, getData, callback)', function (done) {

      var VALUE_4 = Math.random();
      var VALUE_5 = Math.random();

      cache.define(KEY + '4', function (name, calback) {
        name.should.equal(KEY + '4');
        calback(null, VALUE_4);
      });

      cache.get(KEY + '4', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_4);

        cache.get(KEY + '5', function (name, callback) {
          name.should.equal(name);
          callback(null, VALUE_5);
        }, function (err, ret) {
          should.equal(err, null);
          ret.should.be.equal(VALUE_5);

          done();
        });
      });

    });


    it('#' + title + ' delete(name, callback)', function (done) {

      var VALUE_6 = Math.random();
      var counter = 0;

      cache.define(KEY + '6', function (name, callback) {
        name.should.equal(KEY + '6');
        counter++;
        callback(null, VALUE_6);
      });

      cache.get(KEY + '6', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_6);

        cache.get(KEY + '6', function (err, ret) {
          should.equal(err, null);
          ret.should.be.equal(VALUE_6);

          cache.delete(KEY + '6', function (err) {
            should.equal(err, null);

            cache.get(KEY + '6', function (err, ret) {
              should.equal(err, null);
              ret.should.be.equal(VALUE_6);

              counter.should.equal(2);

              done();
            });
          });
        });
      });

    });


    it('#' + title + ' call get(name) many times in the same time, only call getData() once', function (done) {

      var TIMES = 10;
      var VALUE_7 = Math.random();
      var counter_1 = 0;
      var counter_2 = 0;

      cache.define(KEY + '7', function (name, callback) {
        name.should.equal(KEY + '7');
        counter_1++;
        setTimeout(function () {
          callback(null, VALUE_7);
        }, Math.random() * 500);
      });

      async.times(TIMES, function (i, next) {
        cache.get(KEY + '7', function (err, ret) {
          counter_2++;
          should.equal(err, null);
          ret.should.be.equal(VALUE_7);
          next();
        });
      }, function (err) {
        should.equal(err, null);

        counter_1.should.equal(1);
        counter_2.should.equal(TIMES);

        done();
      });

    });


    it('#' + title + ' get(name, callback) cache not defined, return error', function (done) {

      cache.get(KEY + '8', function (err, ret) {
        should.exists(err, null);

        cache.get(KEY + '9', function (err, ret) {
          should.exists(err, null);
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
    prefix: 'cache_' + Math.random(),
    path: path.resolve(__dirname, 'data'),
    max: 5,
    gcProbability: 0.5
  }));

  generateTest('RedisStore [pool=2]', new SuperCache.RedisStore({pool: 2}));
  generateTest('MemcacheStore [pool=2]', new SuperCache.MemcacheStore({pool: 2}));

});
