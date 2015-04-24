# super-cache
Node.js缓存管理模块，支持自定义存储引擎


## 在Node.js中使用

1、安装：

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

1、Shim方式：

```html
<script src="dist/supercache.js"></script>
<script>
var cache = new SuperCache({ttl: 60});
</script>
```

2、AMD方式：

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
  // 如果没有指定ttl则使用默认的ttl
  callback(null, data, ttl);
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
  prefix: 'cache:'    // key前缀
});
```

3、Memchache存储引擎（仅Node.js中使用）

```javascript
var store = new SuperCache.MemcacheStore({
  host: '127.0.0.1',  // 服务器地址
  port: 11211,        // 服务器端口
  prefix: 'cache:'    // key前缀
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
  // 若data为undefined表示该缓存不存在
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


## TODO

+ 内置存储引擎支持连接池


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
