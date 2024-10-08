# miniapp request

一个轻量的小程序 request 封装，在不改变原有的小程序 request 的基础上，增加了以下支持：

1. 自定义拦截器（RequestInterceptor、ResponseInterceptor）；
2. 支持 Promise；
3. 支持取消请求；
4. 更常用的接口字段命名；
5. 支持 chunked 传输；

## 使用方法

### 安装依赖

```shell script
npm i @mini-dev/request
```

引入 request：

```javascript
const { request } = require('@mini-dev/request');

// 发起请求，参数与 wx.reqeust 一致，但是返回 Promise
request({ ... });
```

上述方式引用的是默认 request 对象，如果不同的业务需要不同的 request，可以自行创建：

```javascript
const { request } = require('@mini-dev/request');

const anotherRequest1 = request.create();
anotherRequest1({ ... });

const anotherRequest2 = request.create();
anotherRequest2({ ... });
```

### 发起请求

```javascript
const { request } = require('@mini-dev/request');
request({
    url: 'https://xxxxxxx',
    method: 'post',
    params: {
        name: 'xesam'
    },
    data: {
        name: 'xesam'
    },
    headers: { // 这里也可以使用小程序文档的 header 字段
        auth: 'xxx'
    }
}).then(...).catch(...);
```

由于小程序的字段定义比较特异，所以对 option 做了一个略规范的定义：

    method：如果没有设置，就使用 GET
    params：添加到 url 上的参数
    headers：请求头字段，如果有设置小程序默认的 header ，则 header 字段会覆盖 headers

其他参数会原样传入。

### 取消请求

由于改成了 Promise
返回，因此无法直接访问到原始的 [RequestTask](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/RequestTask.html)
对象，因此提供了其他的方式：

```javascript
const { request } = require('@mini-dev/request');

const controller = new AbortController();
request({
    url: 'https://httpbin.org/delay/8',
    signal: controller.signal
})
    .then((res) => {
        console.log(res);
    })
    .catch((err) => {
        console.error(err);
    });

setTimeout(() => {
    controller.abort();
}, 1000); // 1 秒后取消请求
```

### 替换微信的 request

有时候为了方便，我们可能需要替换微信的 request，此时可以使用 mount 方法，将 wx.request 替换为自定义的 request：

```javascript
const { request } = require('@mini-dev/request');

// 替换微信的 request
request.mount(wx);

// 发起请求，参数与 wx.request 一致，但是返回 Promise
wx.request({ ... });
```

不过，不太建议轻易替换原生框架的方法，因为小程序的框架是经过严格测试的，如果替换了，可能会导致一些问题。所以，可以考虑在 wx
全局对象上添加自定义对象：

```javascript
const { request } = require('@mini-dev/request');

// 替换微信的 request
request.mount(wx, 'biubiubiu_request');

// 发起请求，参数与 wx.request 一致，但是返回 Promise
wx.biubiubiu_request({ ... });
```

### 添加拦截器

```javascript
const { request } = require('@mini-dev/request');

// 添加 请求 拦截器
request
    .addRequestInterceptor((req) => {
        return new Promise((resolve) => {
            console.log('this is request interceptor A');
            setTimeout(function() {
                resolve(req);
            }, 1000);
        });
    })
    .addRequestInterceptor((req) => {
        console.log('this is request interceptor B');
        return req;
    });

// 添加 响应 拦截器
request
    .addResponseInterceptor((res) => {
        console.log('this is response interceptor A');
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(res);
            }, 1000);
        });
    })
    .addResponseInterceptor((res) => {
        console.log('this is response interceptor B');
        return res;
    });
```

#### 拦截器的执行顺序

对于 request 拦截器，先添加的拦截器都会**后**执行
对于 response 拦截器，先添加的拦截器都会**先**执行。
因此，上述拦截器的调用顺序为：

    -> 1. request interceptor B
    -> 2. request interceptor A
    -> 3. {http request}
    -> 4. response interceptor A
    -> 5. response interceptor B

#### 拦截器的参数

请求拦截器的参数就是发送给 request 的参数，响应拦截器的参数就是 request 返回的 res 对象，两者并未做任何封装。

### 页面调用

```javascript
Page({
    onTapGet(e) {
        const controller = new AbortController();
        request({
            url: 'https://httpbin.org/get',
            method: 'get', //默认使用 get
            params: {},
            signal: controller.signal
        })
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.error(err);
            });
        controller.abort();
    }
});
```

### chunked 传输说明

#### enableChunked 参数

开启 chunked 传输需要添加 option 参数：`enableChunked: true`，这是 wx.request 的官方参数，

需要说明的是，在启用 enableChunked 的情况下：

1. wx.request 的 success 回调会等到传输全部结束之后再调用。
2. 如果服务器的返回结果并不是 chunked 传输（比如没有配置 {'Transfer-Encoding', 'chunked'} header），那么就只能正常获取到
   headers，而无法获取到的实际的响应体，所以需要注意服务器的返回方式。 以 express 为例，用 write + end 进行响应返回。

#### enableChunkedBuffer

这是 `@mini-dev/request` 自定义的参数，默认值是 true。

也就是说，如果服务器已经返回了数据，但是你还没有添加 on 监听事件，那么已经返回的数据会缓存起来。
当你第一次添加对应的 event-handler 时，会一次性传输给 event-handler。

至于为何会存在这种情况，一个原因就是由于res拦截器是异步的，有可能造成了实际监听的延迟。

## 示例

参见 [sample 小程序](./sample)，[sample 小程序 对应的测试服务器](./sample-server)

## Todo

支持 `enctype` 参数，可选值：`urlencoded`

## ChangeLogs

### 0.3.3

1. 修正 `mount` 方法的实现问题，再次声明：不建议替换原生同名方法。

### 0.3.2

1. 支持缓存chunks;

### 0.3.1

1. res 增加 chunked 标志；

### 0.3.0

1. Stream resolve 时机修正；
2. response interceptor 增加 req 入参；

### 0.2.0

1. 增加 Stream 传输支持；
2. 增加 mount，方便挂载到app上，或者直接替换 wx 的原始 request；

### 0.1.0

1. 拆分 VendorHttpEngine；
2. 补全 tests；
