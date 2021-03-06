/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var SuperCache = require('../');

describe('MemcacheStore', function () {

  function generateTest (title, options) {

    var MAX = 5;
    var TTL = 1;
    var store = new SuperCache.MemcacheStore(options);
    var KEY = 'test-key-' + Math.random();


    it('#' + title + ' get(name, callback) & set(name, data, ttl, callback) & del(name, callback)', function (done) {

      var VALUE_1 = Math.random();
      var VALUE_2 = Math.random();

      async.series([
        function (next) {
          store.set(KEY + '1', VALUE_1, TTL, function (err) {
            should.equal(err, null);
            next();
          });
        },
        function (next) {
          store.set(KEY + '2', VALUE_2, TTL, function (err) {
            should.equal(err, null);
            next();
          });
        },
        function (next) {
          store.get(KEY + '1', function (err, ret) {
            should.equal(err, null);
            ret.should.equal(VALUE_1);
            next();
          });
        },
        function (next) {
          store.get(KEY + '2', function (err, ret) {
            should.equal(err, null);
            ret.should.equal(VALUE_2);
            next();
          });
        },
        function (next) {
          store.get(KEY + '2_2', function (err, ret) {
            should.equal(err, null);
            should.equal(ret, null);
            next();
          });
        },
        function (next) {
          store.delete(KEY + '2', function (err) {
            should.equal(err, null);
            next();
          });
        },
        function (next) {
          store.get(KEY + '2', function (err, ret) {
            should.equal(err, null);
            should.equal(ret, null);
            next();
          });
        },
        function (next) {
          store.get(KEY + '1', function (err, ret) {
            should.equal(err, null);
            ret.should.equal(VALUE_1);
            next();
          });
        }
      ], done);

    });

  }

  generateTest('no pool', {});
  generateTest('pool=2', {pool: 2});
  generateTest('pool=3', {pool: 3});


});
