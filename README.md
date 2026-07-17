# miniapp request

一个轻量的小程序 `request` 封装，在不改变原有小程序 `request` 用法的基础上，增加了以下支持：

1. 自定义拦截器（RequestInterceptor、ResponseInterceptor）；
2. 支持 Promise；
3. 支持取消请求；
4. 更常用的接口字段命名；
5. 支持 chunked 传输；

## 目录

- [1. 安装](#1-安装)
- [2. 快速开始](#2-快速开始)
- [3. 请求参数说明](#3-请求参数说明)
- [4. 创建独立的 request 实例](#4-创建独立的-request-实例)
- [5. 拦截器](#5-拦截器)
- [6. 取消请求](#6-取消请求)
- [7. chunked 传输](#7-chunked-传输)
- [8. 替换微信原生 request（mount）](#8-替换微信原生-requestmount)
- [9. 常见问题](#9-常见问题)
- [10. 示例项目](#10-示例项目)
- [11. Todo](#11-todo)
- [12. 更新日志](#12-更新日志)

## 1. 安装

```shell script
npm i @mini-dev/request
```

安装完成后，需要在**微信开发者工具**里执行一次「工具 -> 构建 npm」，否则小程序无法识别 `node_modules` 里的包，这是使用小程序 npm 包时最容易被忽略的一步。

## 2. 快速开始

```javascript
const { request } = require('@mini-dev/request');

// 参数与 wx.request 基本一致，但返回 Promise
request({
    url: 'http://127.0.0.1:3000/get',
    method: 'get',
    params: { name: 'xesam' }
})
    .then((res) => {
        console.log(res.data);
    })
    .catch((err) => {
        console.error(err);
    });
```

上面用的是包内默认的 `request` 对象，可以直接在任意页面 `require` 后使用。如果不同业务需要各自独立的拦截器逻辑，参见 [4. 创建独立的 request 实例](#4-创建独立的-request-实例)。

> `request` 内部默认使用 `wx.request` 作为底层引擎，因此只能在小程序环境（存在全局 `wx` 对象）下直接调用。如果需要在非小程序环境（如 Node 单测）中使用，请参见 [9. 常见问题](#9-常见问题)。

## 3. 请求参数说明

由于小程序原生字段命名比较特异，这里对常用字段做了更常规的定义：

| 参数 | 说明 | 注意事项 |
| --- | --- | --- |
| `method` | 请求方法，不区分大小写 | 未设置时默认使用 `GET` |
| `params` | 附加参数，最终会拼接到 url 或合并进 `data` | 见下方 **GET 请求下的 params/data 优先级** |
| `data` | 请求体（非 GET）或最终拼接到 url 的参数（GET） | GET 请求下若已设置 `data`，`params` 会被忽略 |
| `headers` | 请求头，语义等价于小程序原生的 `header` | 若同时设置了 `header`，`header` 优先，`headers` 会被忽略 |
| `signal` | 传入 `AbortController.signal`，用于取消请求 | 见 [6. 取消请求](#6-取消请求) |
| `enableChunked` | 开启 chunked 传输 | 见 [7. chunked 传输](#7-chunked-传输) |
| `enableChunkedBuffer` | 是否缓存已到达但尚未监听的 chunk 数据，默认 `true` | 见 [7. chunked 传输](#7-chunked-传输) |

其余字段（如 `timeout`、`dataType`、`responseType` 等）会原样传给 `wx.request`。

**GET 请求下的 params/data 优先级**

微信小程序会自动把 GET 请求的 `data` 拼接到 url 上，因此本库对 GET 请求做了特殊处理：

```javascript
request({
    url: 'https://x.y.z',
    method: 'GET',
    params: { a: 1 }   // 未设置 data 时，params 会被合并进 data
});
```

如果同时设置了 `data`，`params` 会被静默忽略（不会报错），因为此时已经存在明确的请求体：

```javascript
request({
    url: 'https://x.y.z',
    method: 'GET',
    data: { b: 2 },     // 生效
    params: { a: 1 }    // 被忽略，不会拼接到 url
});
```

而对于非 GET 请求（POST/PUT/DELETE/PATCH），`params` 会被拼接到 url 上，`data` 依然作为请求体单独发送，两者互不影响：

```javascript
request({
    url: 'https://x.y.z',
    method: 'POST',
    params: { token: 'xxx' },  // 拼接为 https://x.y.z?token=xxx
    data: { name: 'xesam' }    // 作为请求体
});
```

## 4. 创建独立的 request 实例

默认导出的 `request` 是一个全局共享实例，其拦截器也是全局共享的。如果不同业务模块需要独立的拦截器配置，可以用 `create` 创建互不影响的新实例：

```javascript
const { request } = require('@mini-dev/request');

const anotherRequest1 = request.create();
anotherRequest1({ ... });

const anotherRequest2 = request.create();
anotherRequest2({ ... });
```

`create` 也接受一个自定义的 `HttpEngine` 实例作为参数，用于替换底层网络实现（例如在非小程序环境中做单测或 mock）：

```javascript
const { HttpEngine, request } = require('@mini-dev/request');

class MockHttpEngine extends HttpEngine {
    _handleRequest(option) {
        return Promise.resolve({ data: 'mock data' });
    }
}

const mockRequest = request.create(new MockHttpEngine());
```

## 5. 拦截器

### 5.1 添加拦截器

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

拦截器支持返回同步值或 Promise，两种写法均可混用；拦截器内部同步抛出的异常也会被统一转换为 rejected Promise，可以放心用 `.catch()` 捕获。

### 5.2 执行顺序

对于 request 拦截器，先添加的拦截器都会**后**执行；
对于 response 拦截器，先添加的拦截器都会**先**执行。

因此上面这段代码的调用顺序为：

    -> 1. request interceptor B
    -> 2. request interceptor A
    -> 3. {http request}
    -> 4. response interceptor A
    -> 5. response interceptor B

### 5.3 参数说明

请求拦截器的参数就是发送给 `request` 的原始 option 对象，响应拦截器的第一个参数是 `request` 返回的 `res` 对象，第二个参数是对应的原始 option 对象；两者均未做任何额外封装。

## 6. 取消请求

由于改成了 Promise 返回，无法直接访问到原始的 [RequestTask](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/RequestTask.html) 对象，因此提供了一个类似浏览器 `fetch` 的取消方式：

```javascript
Page({
    onTapGet(e) {
        const { request, AbortController } = require('@mini-dev/request');
        const controller = new AbortController();

        request({
            url: 'http://127.0.0.1:3000/delay/8',
            signal: controller.signal
        })
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.error(err); // err.errMsg 为 'request:fail abort'
            });

        setTimeout(() => {
            controller.abort(); // 1 秒后取消请求
        }, 1000);
    }
});
```

补充说明：

- 同一个 `signal` 可以传给多个并发请求，`abort()` 会一次性取消所有绑定在它上面的请求。
- 如果在请求真正发出**之前** `signal` 就已经被 `abort()`，本库会直接短路 reject，不会再发起真实的网络请求。

## 7. chunked 传输

### 7.1 enableChunked 参数

开启 chunked 传输需要添加 option 参数：`enableChunked: true`，这是 `wx.request` 的官方参数。

需要说明的是，在启用 `enableChunked` 的情况下：

1. `wx.request` 的 `success` 回调会等到传输全部结束之后才调用；
2. 如果服务器的返回结果并不是 chunked 传输（比如没有配置 `{'Transfer-Encoding': 'chunked'}` header），那么只能正常获取到 headers，无法获取到实际的响应体，所以需要注意服务器的返回方式。以 express 为例，需要用 `write` + `end` 进行响应返回。

### 7.2 enableChunkedBuffer 参数

这是 `@mini-dev/request` 自定义的参数，默认值是 `true`。

也就是说，如果服务器已经返回了数据，但你还没有添加 `on` 监听事件，那么已经返回的数据会先被缓存起来；当你第一次添加对应的 event-handler 时，会一次性把缓存的数据传给它。

之所以存在这种情况，是因为响应拦截器是异步执行的，有可能造成实际监听时机的延迟，导致监听添加前已经有 chunk 到达。

## 8. 替换微信原生 request（mount）

有时候为了方便，可能需要替换 `wx.request`，此时可以使用 `mount` 方法：

```javascript
const { request } = require('@mini-dev/request');

// 替换微信的 request
request.mount(wx);

// 发起请求，参数与 wx.request 一致，但返回 Promise
wx.request({ ... });
```

不太建议轻易替换原生框架的方法，因为小程序框架经过了严格测试，替换后可能引发一些意料之外的问题。更推荐的方式是在 `wx` 全局对象上挂载一个自定义名字：

```javascript
const { request } = require('@mini-dev/request');

request.mount(wx, 'biubiubiu_request');

wx.biubiubiu_request({ ... });
```

> 注意：请不要在 `mount(wx)` **之后**再用 `wx` 创建新的自定义 `HttpEngine` 实例（例如 `new VendorHttpEngine(wx)`），此时 `wx.request` 已经被替换成了本库的 `request`，会导致新引擎绑定到自己身上形成递归调用。

## 9. 常见问题

**Q: `catch` 到的 `err` 是不是 `Error` 实例？**

不一定。真正的网络失败错误直接来自 `wx.request` 原生 `fail` 回调，通常是形如 `{ errMsg: '...' }` 的普通对象，并非 `Error` 实例；只有主动调用 `controller.abort()` 触发的取消错误才是 `Error` 实例（同时也带有 `errMsg` 字段）。建议统一通过 `err.errMsg` 判断错误信息，而不要依赖 `err instanceof Error`。

**Q: 想在非小程序环境（比如 Node 单测）里使用该怎么办？**

`request` 默认依赖全局 `wx` 对象，在没有 `wx` 的环境下直接调用会抛出 `No engine found`。可以用 `request.create(customEngine)` 传入一个自定义的 `HttpEngine` 子类实例来替代真实网络请求，参见 [4. 创建独立的 request 实例](#4-创建独立的-request-实例)。

**Q: `headers` 设置了不生效？**

如果 option 里同时设置了 `header`（小程序原生字段）和 `headers`（本库字段），`header` 会优先生效，`headers` 会被忽略。二者选其一即可。

## 10. 示例项目

项目自带两个配套的示例工程：

- [`sample-server`](./sample-server)：基于 Express 的本地测试服务器，为下面的小程序示例提供接口；
- [`sample-request-wechat`](./sample-request-wechat)：微信小程序示例工程，演示本库的各项用法，需要用微信开发者工具打开。

### 10.1 sample-server

提供了以下接口：

| 接口 | 说明 |
| --- | --- |
| `/get`、`/post`、`/put`、`/patch`、`/delete` | 模拟 httpbin.org 风格的回显接口，返回 `args`/`data`/`headers`/`method`/`url` |
| `/delay/:seconds` | 延迟指定秒数（最长 10 秒）后返回，用于演示超时/取消 |
| `/plain-with-header`、`/plain-without-header` | 一次性返回多段文本，用于演示 `Transfer-Encoding: chunked` 响应头对 chunked 传输的影响 |
| `/stream-with-header`、`/stream-without-header` | 以固定间隔持续推送数据，模拟真实的流式接口 |
| `/stream-timeout` | 不返回任何响应，用于演示超时 |
| `/stream-hang-up` | 持续推送但从不结束，用于演示中途取消 |

启动方式：

```shell script
cd sample-server
npm i
npm run dev
# 如果你的 node 版本高于 22，可以使用
npm run dev22
```

服务默认监听 `http://127.0.0.1:3000`。

### 10.2 sample-request-wechat

用微信开发者工具打开即可。运行前请先启动上面的 `sample-server`（示例中的接口地址均指向 `http://127.0.0.1:3000`），并在工程目录下执行一次 `npm i`，再在开发者工具里执行「工具 -> 构建 npm」。

工程包含以下几个示例页面：

| 页面 | 说明 |
| --- | --- |
| [`pages/methods`](./sample-request-wechat/pages/methods) | 演示 GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD/TRACE/CONNECT 等常见请求方法，以及 GET 请求下 `params`/`data` 的拼接方式 |
| [`pages/control`](./sample-request-wechat/pages/control) | 演示请求超时（`timeout`）与主动取消（`AbortController`） |
| [`pages/stream`](./sample-request-wechat/pages/stream) | 演示 chunked 流式传输，包括是否携带响应头、`enableChunkedBuffer` 缓存开关、流式传输中途取消等场景 |
| [`pages/mount`](./sample-request-wechat/pages/mount) | 演示 `mount` 方法，将 `request` 挂载到 `wx`、自定义名字、页面实例上 |
| [`pages/custom`](./sample-request-wechat/pages/custom) | 演示 `create()` 创建独立的 `request` 实例，并附加专属拦截器 |

## 11. Todo

- 支持 `enctype` 参数，可选值：`urlencoded`；

## 12. 更新日志

### 0.3.4

1. 修正 `Response` 构造函数默认参数拼写错误（`ture` -> `true`）导致的潜在 `ReferenceError`；
2. 修正拦截器同步抛出异常时无法被 `.catch` 捕获的问题，统一以 rejected Promise 返回；
3. 修正已 `abort` 的 `signal` 仍会发起真实网络请求的问题，改为发出请求前短路 reject；
4. 支持同一个 `AbortSignal` 绑定并取消多个并发请求（此前只能取消最后一个）；
5. `params` 中的 `null`/`undefined` 字段不再被序列化为字符串 `"null"`/`"undefined"`；
6. 补充 `Response`、`AbortController`/`AbortSignal` 单测。

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
