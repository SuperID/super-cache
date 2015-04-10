/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var SuperCache = require('../');

describe('CacheManager', function () {

  var cache = new SuperCache();


  it('define(name, getData) & get(name, callback)', function (done) {

    var VALUE_1 = Math.random();
    var VALUE_2 = Math.random();

    cache.define('key1', function (name, calback) {
      name.should.equal('key1');
      calback(null, VALUE_1);
    });

    cache.define('key2', function (name, calback) {
      name.should.equal('key2');
      calback(null, VALUE_2);
    });

    cache.get('key1', function (err, ret) {
      should.equal(err, null);
      ret.should.be.equal(VALUE_1);

      cache.get('key2', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_2);

        cache.get('key3', function (err, ret) {
          should.exists(err);

          done();
        });
      });
    });

  });


  it('get(name, getData, callback)', function (done) {

    var VALUE_4 = Math.random();
    var VALUE_5 = Math.random();

    cache.define('key4', function (name, calback) {
      name.should.equal('key4');
      calback(null, VALUE_4);
    });

    cache.get('key4', function (err, ret) {
      should.equal(err, null);
      ret.should.be.equal(VALUE_4);

      cache.get('key5', function (name, callback) {
        name.should.equal(name);
        callback(null, VALUE_5);
      }, function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_5);

        done();
      });
    });

  });


  it('delete(name, callback)', function (done) {

    var VALUE_6 = Math.random();
    var counter = 0;

    cache.define('key6', function (name, callback) {
      name.should.equal('key6');
      counter++;
      callback(null, VALUE_6);
    });

    cache.get('key6', function (err, ret) {
      should.equal(err, null);
      ret.should.be.equal(VALUE_6);

      cache.get('key6', function (err, ret) {
        should.equal(err, null);
        ret.should.be.equal(VALUE_6);

        cache.delete('key6', function (err) {
          should.equal(err, null);

          cache.get('key6', function (err, ret) {
            should.equal(err, null);
            ret.should.be.equal(VALUE_6);

            counter.should.equal(2);

            done();
          });
        });
      });
    });

  });


  it('call get(name) many times in the same time, only call getData() once', function (done) {

    var TIMES = 10;
    var VALUE_7 = Math.random();
    var counter_1 = 0;
    var counter_2 = 0;

    cache.define('key7', function (name, callback) {
      name.should.equal('key7');
      counter_1++;
      setTimeout(function () {
        callback(null, VALUE_7);
      }, Math.random() * 500);
    });

    async.times(TIMES, function (i, next) {
      cache.get('key7', function (err, ret) {
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


  it('get(name, callback) cache not defined, return error', function (done) {

    cache.get('key8', function (err, ret) {
      should.exists(err, null);

      cache.get('key9', function (err, ret) {
        should.exists(err, null);
        done();
      });
    });

  });


});
