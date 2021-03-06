[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Gittip][gittip-image]][gittip-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/super-cache.svg?style=flat-square
[npm-url]: https://npmjs.org/package/super-cache
[travis-image]: https://img.shields.io/travis/SuperID/super-cache.svg?style=flat-square
[travis-url]: https://travis-ci.org/SuperID/super-cache
[coveralls-image]: https://img.shields.io/coveralls/SuperID/super-cache.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/SuperID/super-cache?branch=master
[gittip-image]: https://img.shields.io/gittip/SuperID.svg?style=flat-square
[gittip-url]: https://www.gittip.com/SuperID/
[david-image]: https://img.shields.io/david/SuperID/super-cache.svg?style=flat-square
[david-url]: https://david-dm.org/SuperID/super-cache
[node-image]: https://img.shields.io/badge/node.js-%3E=_4.0-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/super-cache.svg?style=flat-square
[download-url]: https://npmjs.org/package/super-cache


# super-cache
Node.js缓存管理模块，支持自定义存储引擎


## 在Node.js中使用

1、安装

```bash
$ npm install super-cache --save
```

2、载入模块

```javascript
var SuperCache = require('super-cache');
var cache = new SuperCache({ttl: 60});
```


## 在浏览器中使用

可供在浏览器上使用的文件存放在`dist`目录

1、Shim方式

```html
<script src="dist/supercache.js"></script>
<script>
var cache = new SuperCache({ttl: 60});
</script>
```

2、AMD方式

```html
<script>
require.config({
  baseUrl: './dist/'
})
require(['supercache'], function (SuperCache) {
  var cache = new SuperCache({ttl: 60});
});
</script>
```


## 入门

```javascript
var cache = new SuperCache({ttl: 60});

// 定义缓存date的数据如何获取
cache.define('date', function (name, callback) {
  callback(null, new Date().toLocaleTimeString());
});

// 取缓存，如果缓存不存在则会先调用已设置的方法来获取
cache.get('date', function (err, ret) {
  if (err) throw err;
  console.log(ret);
});
```


## 详细使用方法

1、创建`SuperCache`实例：

```javascript
var cache = new SuperCache({
  // 存储引擎
  store: new SuperCache.MemoryStore(),
  // 缓存有效期，单位：秒
  ttl: 60
});
```

2、定义获取缓存的方法：

```javascript
// 定义获取缓存key的方法
cache.define('key', function (name, callback) {
  // name是当前缓存的名称
  // 此处查询数据库，再调用callback返回数据
  // 如果data为undefined活null，则不会被缓存
  // 如果没有指定ttl则使用默认的ttl
  callback(null, data, ttl);
  // 默认data=null或undefined时也会缓存结果，如果想不缓存，指定notNull参数
  callback(null, {ttl: ttl, notNull: true});
});

// key可以是一个正则表达式，或者是一个函数（返回true/fase）
// 当查找没有匹配的字符串key时，则会依次判断正则表达式或者函数的key
// 所以此类key数量不宜过多
cache.define(/^xx/, function (name, callback) {
  callback(null, data);
});
cache.define(function (name) {
  return name.indexOf('xx') === 0;
}, function (name, callback) {
  callback(null, data);
});
```

3、查询缓存：

```javascript
// 获取缓存，如果缓存不存在则先执行预设的方法取得缓存再返回
cache.get('key', function (err, data) {
  // 如果出错，err为出错信息
  // data为缓存数据
  console.log(data);
});
```

4、查询临时的缓存：

```javascript
// 获取缓存，如果缓存不存在则使用当前设置的方法取得缓存再返回
cache.get('key', function (name, callback) {
  // name是当前缓存的名称
  // 此处查询数据库，在调用callback返回数据
  // 如果data为undefined活null，则不会被缓存
  // 如果没有指定ttl则使用默认的ttl
  callback(null, data, ttl);
}, function (err, data) {
  // 如果出错，err为出错信息
  // data为缓存数据
  console.log(data);
});
```

5、设置缓存：

```javascript
// 设置缓存，如果没有指定ttl则使用默认的ttl
// 回调函数可选
cache.set('key', data, ttl, function (err) {
  // 如果出错，err为出错信息
});
```

6、删除缓存：

```javascript
// 设置缓存，如果没有指定ttl则使用默认的ttl
// 回调函数可选
cache.delete('key', function (err) {
  // 如果出错，err为出错信息
});
```


## 内置的存储引擎

使用内置的存储引擎可以设置`store`为一个字符串，比如：

```javascript
var cache = new SuperCache({
  // 存储引擎
  store: 'memory',
  // 存储引擎的初始化参数
  storeConfig: {
    max: 1000,
    gcProbability: 0.01
  },
  // 缓存有效期，单位：秒
  ttl: 60
});
```

内置存储引擎包括`memory`，`redis`，`memcache`，`local`。

1、Memory存储引擎

```javascript
// max为最大key数量
var store = new SuperCache.MemoryStore({
  max: 1000,            // 最大key数量
  gcProbability: 0.01   // 执行GC的几率，0.01表示1%
});
```

2、Redis存储引擎（仅Node.js中使用）

```javascript
var store = new SuperCache.RedisStore({
  host: '127.0.0.1',  // 服务器地址
  port: 6379,         // 服务器端口
  db: 0,              // 数据库号码
  prefix: 'cache:',   // key前缀
  password: 'xxx',    // 密码
  pool: 1             // 连接池数量
});
```

3、Memchache存储引擎（仅Node.js中使用）

```javascript
var store = new SuperCache.MemcacheStore({
  host: '127.0.0.1',  // 服务器地址
  port: 11211,        // 服务器端口
  prefix: 'cache:',   // key前缀
  user: 'xxx',        // 用户名
  password: 'xxx',    // 密码
  pool: 1             // 连接池数量
});
```

4、localStorage/sessionStorage存储引擎（仅浏览器中使用）

```javascript
// max为最大key数量
var store = new SuperCache.LocalStore({
  type: 'local',        // 类型，local=localStorage, session=sessionStorage, 默认local
  prefix: 'cache_',     // key前缀，默认cache_
  path: './data',       // 数据存储路径，仅Node.js中使用时需要指定
  max: 1000,            // 最大key数量，默认1000
  gcProbability: 0.01   // 执行GC的几率，0.01表示1%
});
```


## 自定义存储引擎

存储引擎需要实现以下接口：

```javascript
var store = {};

// 取缓存
store.get = function (name, callback) {
  // name为缓存名称
  // 此处查询数据库，再调用callback返回数据
  // 若data为undefined或null表示该缓存不存在
  callback(null, data);
};

// 设置缓存
store.set = function (name, data, ttl, callback) {
  // name为缓存名称
  // data为缓存数据
  // ttl为缓存有效期
  // 设置完缓存后，再调用callback返回
  callback(null);
};

// 删除缓存
store.delete = function (name, callback) {
  // name为缓存名称
  // 删除完缓存后，再调用callback返回
};
```


## License

```
The MIT License (MIT)

Copyright (c) 2015-2016 SuperID | 一切只为简单登录

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
