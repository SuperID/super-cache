/**
 * Super-Cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var should = require('should');
var SuperCache = require('../');

describe('CacheManager', function () {

  var cache = new SuperCache({
    store: new SuperCache.MemoryStore(10)
  });


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

});
