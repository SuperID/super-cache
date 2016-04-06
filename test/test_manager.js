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

  function generateTest (title, options) {

    var cache = new SuperCache(options);
    var KEY = 'test-key-' + Math.random();

    it('#' + title + ' define(name, getData) & get(name, callback)', function (done) {

      var cache = new SuperCache(options);
      var KEY = 'test-key-' + Math.random();

      var VALUE_1 = Math.random();
      var VALUE_2 = Math.random();

      var status = {
        define1: false,
        define2: false,
        set1: false,
        set2: false,
      };
      cache.on('define', function (name, getData) {
        should.equal(typeof name, 'string');
        should.equal(typeof getData, 'function');
        if (name === KEY + '1') status.define1 = true;
        else if (name === KEY + '2') status.define2 = true;
        else throw new Error('unexcepted define key name: ' + name);
      });
      cache.on('set', function (name, value) {
        should.equal(typeof name, 'string');
        should.equal(typeof value, 'number');
        if (name === KEY + '1') status.set1 = true;
        else if (name === KEY + '2') status.set2 = true;
        else throw new Error('unexcepted set key name: ' + name);
      });

      cache.define(KEY + '1', function (name, calback) {
        name.should.equal(KEY + '1');
        calback(null, VALUE_1);
      });

      cache.define(KEY + '2', function (name, calback) {
        name.should.equal(KEY + '2');
        calback(null, VALUE_2);
      });

      status.define1.should.be.equal(true);
      status.define2.should.be.equal(true);

      cache.get(KEY + '1', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_1);

        cache.get(KEY + '2', function (err, ret) {
          should.equal(err, null);
          ret.should.be.equal(VALUE_2);

          cache.get(KEY + '3', function (err, ret) {
            should.exists(err);

            status.set1.should.be.equal(true);
            status.set2.should.be.equal(true);

            done();
          });
        });
      });

    });

    it('#' + title + ' define(name, getData) & get(name, callback) #regexp', function (done) {

      var VALUE_1 = Math.random();
      var VALUE_2 = Math.random();

      var reg = new RegExp('^' + KEY.replace(/\-/g, '\\-').replace(/\./g, '\\.') + 'x1\\d$');
      cache.define(reg, function (name, callback) {
        var n = name.slice(KEY.length + 2);
        if (n === '1') return callback(null, VALUE_1);
        if (n === '2') return callback(null, VALUE_2);
        callback(new Error('name should be ' + KEY + '1 or ' + KEY + '2'));
      });

      cache.get(KEY + 'x11', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_1);

        cache.get(KEY + 'x12', function (err, ret) {
          should.equal(err, null);
          ret.should.be.equal(VALUE_2);

          cache.get(KEY + 'x13', function (err, ret) {
            should.exists(err);

            cache.get(KEY + '3', function (err, ret) {
              should.exists(err);

              done();
            });
          });
        });
      });

    });


    it('#' + title + ' define(name, getData) & get(name, callback) #function', function (done) {

      var VALUE_1 = Math.random();
      var VALUE_2 = Math.random();

      cache.define(function (name) {
        return name.indexOf(KEY + 'x2') === 0;
      }, function (name, callback) {
        var n = name.slice(KEY.length + 2);
        if (n === '1') return callback(null, VALUE_1);
        if (n === '2') return callback(null, VALUE_2);
        callback(new Error('name should be ' + KEY + '1 or ' + KEY + '2'));
      });

      cache.get(KEY + 'x21', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_1);

        cache.get(KEY + 'x22', function (err, ret) {
          should.equal(err, null);
          ret.should.be.equal(VALUE_2);

          cache.get(KEY + 'x23', function (err, ret) {
            should.exists(err);

            cache.get(KEY + '3', function (err, ret) {
              should.exists(err);

              done();
            });
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

  generateTest('MemoryStore', {store: new SuperCache.MemoryStore()});
  generateTest('RedisStore', {store: new SuperCache.RedisStore()});
  generateTest('MemcacheStore', {store: new SuperCache.MemcacheStore()});
  generateTest('LocalStore', {store: new SuperCache.LocalStore({
    type: 'local',
    prefix: 'cache_' + Math.random(),
    path: path.resolve(__dirname, 'data'),
    max: 5,
    gcProbability: 0.5
  })});

  generateTest('MemoryStore', {store: 'memory'});
  generateTest('RedisStore', {store: 'redis'});
  generateTest('MemcacheStore', {store: 'memcache'});
  generateTest('LocalStore', {store: 'local', storeConfig: {
    type: 'local',
    prefix: 'cache_' + Math.random(),
    path: path.resolve(__dirname, 'data'),
    max: 5,
    gcProbability: 0.5
  }});

  generateTest('RedisStore [pool=2]', {store: new SuperCache.RedisStore(), pool: 2});
  generateTest('MemcacheStore [pool=2]', {store: new SuperCache.MemcacheStore(), pool: 2});

});
