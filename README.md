# super-cache
Node.js缓存模块，支持自定义存储引擎


## 安装

```bash
$ npm install super-cache --save
```


## 使用

```javascript
var SuperCache = require('super-cache');

var cache = new SuperCache({
  // 存储引擎
  store: new SuperCache.MemoryStore(100),
  // 缓存有效期，单位：秒
  ttl: 60
});

// 定义获取缓存key的方法
cache.define('key', function (name, callback) {
  // name是当前缓存的名称
  // 此处查询数据库，再调用callback返回数据
  // 如果没有指定ttl则使用默认的ttl
  callback(null, data, ttl);
});

// 获取缓存，如果缓存不存在则先执行预设的方法取得缓存再返回
cache.get('key', function (err, data) {
  // 如果出错，err为出错信息
  // data为缓存数据
});

// 获取缓存，如果缓存不存在则使用当前设置的方法取得缓存再返回
cache.get('key', function (name, callback) {
  // name是当前缓存的名称
  // 此处查询数据库，在调用callback返回数据
  // 如果没有指定ttl则使用默认的ttl
  callback(null, data, ttl);
}, function (err, data) {
  // 如果出错，err为出错信息
  // data为缓存数据
});

// 设置缓存，如果没有指定ttl则使用默认的ttl
cache.set('key', data, ttl);
```


## 内置支持的存储引擎

1、Memory存储引擎

```javascript
// max为最大key数量
var store = new SuperCache.MemoryStore(max);
```

2、Redis存储引擎

```javascript
var store = new SuperCache.RedisStore({
  host: '127.0.0.1',
  port: 6379,
  db: 0,
  prefix: 'cache:'
});
```

3、Memchache存储引擎

```javascript
var store = new SuperCache.MemcacheStore({
  host: '127.0.0.1',
  port: 11211,
  prefix: 'cache:'
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
  // 若data为undefined表示该缓存不存在
  callback(null, data);
};

// 设置缓存
store.set = function (name, data, ttl, callback) {
  // name为缓存名称
  // data为缓存数据
  // ttl为缓存有效期
  // 设置完缓存后，再调用callback返回
  callbacl(null);
};
```


## License

```
The MIT License (MIT)

Copyright (c) 2015 SuperID | 一切只为简单登录

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
