# miniapp request

跨微信 / 支付宝 / 抖音小程序的 HTTP 请求库（TS）。在不改变原生 `request` 语义的前提下增强：**Promise 化、两段式拦截器、取消、超时、重试、缓存、chunked 流式**。原生入参 / 响应 / 错误原样透传，只增强、不归一。

## 示例

```javascript
const { request } = require('@mini-dev/request-wx');

// 拦截器：自动给每个请求注入鉴权头、统一处理响应
request
    .addRequestInterceptor((req) => { 
        req.headers = { ...req.headers, 'X-Token': 't' }; 
        return req; 
    })
    .addResponseInterceptor((res) => { 
        console.log('[res]', res.statusCode); 
        return res; 
    });

request({
    url: 'https://api.example.com/order',
    method: 'post',
    headers: { 'X-Channel': 'wx' },
    data: { sku: 'A1' },
    enableChunked: true, // chunked 流式（仅微信）
    ext: { timeout: 3000, retry: 2 }
}).then((res) => {
        res.data.on('data', (chunk) => console.log('chunk', chunk));
        res.data.on('end', () => console.log('end'));
    });
```

> 原生 `wx.request` 是回调、无拦截器、无超时 / 重试 / 取消 / 缓存，流式还需手搓 `onChunkReceived`。本库在**原生入参 / 响应 / 错误原样透传**的前提下，用洋葱中间件把这些能力叠加回来——返回 Promise，其余字段与原生一致。

## 为什么用它

- **原生多端：微信 / 支付宝 / 抖音三端**统一 API**，直接跑在各家原生小程序上。npm 上同类库多为微信单端；真正的跨端请求能力通常被 Taro / uni-app 的框架层吃掉——不上框架的原生多端场景，一直缺一个统一的请求库，这正是本库的位置。
- **全 TypeScript**：核心 + 平台包均 TS 编写，双格式（CJS / ESM）+ per-format `.d.ts`。
- **只增强、不归一**：原生入参 / 响应 / 错误原样透传，不替你"翻译"平台语义；Promise 化、拦截器、取消、超时、重试、缓存、chunked 用洋葱中间件叠加。
- **`ext` 命名空间隔离库控制**：超时 / 重试 / 缓存 / 取消 / 拦截器统一装在 `ext`，与原生参数隔离，规避未来原生新增字段撞名。

> 说明：本库不做字段归一（augment-only），跨端差异由各平台 engine 显式映射；若你已在用 Taro / uni-app，直接用其内置 `request` 即可，本库面向**不上框架的原生多端**开发。

## 目录

- [一眼看清](#一眼看清)
- [1. 安装](#1-安装)
- [2. 快速开始](#2-快速开始)
- [3. 请求参数说明](#3-请求参数说明)
- [4. 创建独立的 request 实例](#4-创建独立的-request-实例)
- [5. 拦截器](#5-拦截器)
- [6. 取消请求](#6-取消请求)
- [7. 超时与重试](#7-超时与重试)
- [8. 缓存](#8-缓存)
- [9. chunked 传输](#9-chunked-传输)
- [10. augment-only 核心用法](#10-augment-only-核心用法)
- [11. 设计](#11-设计)
- [12. 常见问题](#12-常见问题)
- [13. 示例项目](#13-示例项目)
- [14. 从 0.3.x 迁移](#14-从-03x-迁移)
- [15. 更新日志](#15-更新日志)

## 1. 安装

按平台选一个平台包安装：

```shell script
npm i @mini-dev/request-wx       # 微信
npm i @mini-dev/request-my       # 支付宝
npm i @mini-dev/request-tt       # 抖音
```

核心 `@mini-dev/request` 会作为平台包的依赖自动引入，无需单独安装。消费方只装自己那一个平台包。

安装完成后，需要在对应平台的**开发者工具**里执行一次「工具 -> 构建 npm」（微信）/ 同步小程序（支付宝 IDE）/「同步 npm 包」（抖音），否则小程序无法识别 `node_modules` 里的包。

## 2. 快速开始

```javascript
const { request } = require('@mini-dev/request-wx');

// 参数与 wx.request 基本一致，但返回 Promise
request({
    url: 'http://127.0.0.1:8008/get',
    method: 'get',
    params: { name: 'xesam' }
})
    .then((res) => {
        console.log(res.data);   // 原生 wx.request 的 res.data，原样透传
        console.log(res.statusCode);
        console.log(res.headers); // 等价于原生 res.header
    })
    .catch((err) => {
        console.error(err);
    });
```

上面用的是包内默认的 `request` 单例，可以直接在任意页面 `require` 后使用。如果不同业务需要各自独立的拦截器逻辑，参见 [4. 创建独立的 request 实例](#4-创建独立的-request-实例)。

> 默认单例内部使用 `wx.request` 作为底层引擎，因此只能在小程序环境（存在全局 `wx` 对象）下直接调用。非小程序环境（如 Node 单测）需传自定义 engine，见 [4. 创建独立的 request 实例](#4-创建独立的-request-实例)。

## 3. 请求参数说明

便捷层对 `header`/`params` 做了更常规的归一，其余顶层字段原样透传给 `wx.request`（库不假设原生有哪些参数）；库级控制统一装在保留字段 `ext` 里。

**顶层参数（请求形态 + 归一 + 原生透传）**

| 参数 | 说明 | 注意事项 |
| --- | --- | --- |
| `url` | 请求地址 | 原样透传 |
| `method` | 请求方法，不区分大小写 | 未设置时由原生默认（wx/my/tt 均默认 `GET`） |
| `params` | 附加参数，拼接到 url 或合并进 `data` | 见下方 **GET 请求下的 params/data 优先级**；便捷层归一字段 |
| `data` | 请求体（非 GET）或拼接到 url 的参数（GET） | GET 下若已设 `data`，`params` 被忽略 |
| `headers` | 请求头，等价于原生 `header` | 便捷层归一为 canonical `headers`；若同时设 `header`，**由平台原生字段决定谁优先**：微信 / 抖音原生是 `header` 故 `header` 优先，支付宝原生是 `headers`（无 `header`）故 `headers` 优先。只设其一时无歧义 |
| `enableChunked` | 开启 chunked 传输 | 见 [9. chunked 传输](#9-chunked-传输) |
| `enableChunkedBuffer` | 是否缓存已到达但未监听的 chunk，默认 `true` | 见 [9. chunked 传输](#9-chunked-传输) |
| `timeout` | **原生超时**（task 层中止），原样透传 | 原生字段，非库级超时；库级超时用 `ext.timeout`，二者不要同用 |
| 其余（`dataType`/`responseType`/…） | 不假设，原样透传 | 未来原生新增字段同样透传 |

**库级控制（装在 `ext` 里，与原生参数隔离）**

| `ext` 字段 | 说明 |
| --- | --- |
| `ext.timeout` | 库级超时（ms），>0 启用，到点抛 `RequestError('TIMEOUT')`；见 [7. 超时与重试](#7-超时与重试) |
| `ext.retry` | 对瞬态错误的重试次数；见 [7. 超时与重试](#7-超时与重试) |
| `ext.maxAge` | 响应缓存有效期（ms），>0 启用；见 [8. 缓存](#8-缓存) |
| `ext.signal` | 传入 `AbortController.signal`，用于取消；见 [6. 取消请求](#6-取消请求) |
| `ext.interceptors` | 单次追加的洋葱拦截器（`Interceptor[]`）；见 [10. augment-only 核心用法](#10-augment-only-核心用法) |

> 库控制只在 `ext` 生效；若误写在顶层，会被当作原生参数原样透传（原生不识别则忽略，库级能力不生效）。`timeout` 是唯一一个原生也有的库控制名：顶层 `timeout` 是原生超时，`ext.timeout` 是库级超时，二者不要同时使用。

**GET 请求下的 params/data 优先级**

微信小程序会自动把 GET 请求的 `data` 拼接到 url 上，因此本库对 GET 请求做了特殊处理：

```javascript
request({ url: 'https://x.y.z', method: 'GET', params: { a: 1 } }); // 未设 data，params 合并进 data
request({ url: 'https://x.y.z', method: 'GET', data: { b: 2 }, params: { a: 1 } }); // data 生效，params 静默忽略
```

非 GET 请求（POST/PUT/DELETE/PATCH），`params` 拼接到 url，`data` 仍作为请求体单独发送，互不影响：

```javascript
request({ url: 'https://x.y.z', method: 'POST', params: { token: 'xxx' }, data: { name: 'xesam' } });
// 拼接为 https://x.y.z?token=xxx，data 作为请求体
```

## 4. 创建独立的 request 实例

默认导出的 `request` 是全局共享单例，拦截器也是全局共享的。不同业务模块需要独立配置时用平台包导出的 `createRequest` 建新实例：

```javascript
const { createRequest } = require('@mini-dev/request-wx');

const another = createRequest();
another({ ... });
```

`createRequest` 也接受自定义 engine，用于替换底层网络实现（例如非小程序环境做单测 / mock）。engine 是一个实现 `RequestEngine` 接口的对象（`request(args, signal): Promise<Response>` + 可选 `isTransientError(err)`），详见 [10. augment-only 核心用法](#10-augment-only-核心用法)。

```javascript
const another = createRequest(myEngine); // 注入自定义 engine
```

## 5. 拦截器

### 5.1 添加拦截器

```javascript
const { request } = require('@mini-dev/request-wx');

request
    .addRequestInterceptor((req) => {
        return new Promise((resolve) => {
            console.log('request interceptor A');
            setTimeout(() => resolve(req), 1000);
        });
    })
    .addRequestInterceptor((req) => {
        console.log('request interceptor B');
        return req;
    });

request
    .addResponseInterceptor((res, req) => {
        console.log('response interceptor A');
        return new Promise((resolve) => setTimeout(() => resolve(res), 1000));
    })
    .addResponseInterceptor((res, req) => {
        console.log('response interceptor B');
        return res;
    });
```

拦截器支持返回同步值或 Promise，可混用；同步抛出的异常统一转为 rejected Promise，可 `.catch` 捕获。

### 5.2 执行顺序

- request 拦截器：**先添加的后执行**（`unshift`）
- response 拦截器：**先添加的先执行**（`push`）

这套顺序的效果是**后注册者包在外层**：成对注册时后添加的拦截器，其 request 段最先执行、response 段最后执行，与洋葱中间件"后进先出"的嵌套直觉一致。

上面代码的调用顺序：

```
1. request interceptor B
2. request interceptor A
3. {http request}
4. response interceptor A
5. response interceptor B
```

### 5.3 参数说明

请求拦截器参数是发送给 `request` 的原始 option 对象，可返回（同步/Promise）同一个或新对象继续传递；响应拦截器第一个参数是 `request` 返回的 `res`（`Response` 实例），第二个是对应的原始 option，返回 `res` 继续传递。

## 6. 取消请求

由于改成了 Promise 返回，无法直接访问原始 [RequestTask](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/RequestTask.html)，因此提供类似浏览器 `fetch` 的取消方式：

```javascript
Page({
    onTapGet(e) {
        const { request, AbortController } = require('@mini-dev/request-wx');
        const controller = new AbortController();

        request({ url: 'http://127.0.0.1:8008/delay/8', ext: { signal: controller.signal } })
            .then((res) => console.log(res))
            .catch((err) => {
                console.error(err.code, err.message); // 'CANCELLED' 'request:fail abort'
            });

        setTimeout(() => controller.abort(), 1000); // 1 秒后取消
    }
});
```

补充说明：

- `abort()` 会**真正中断在途请求**：引擎订阅 signal 的 abort 事件后调用 `task.abort()`，与只让 Promise reject 不同。
- 同一个 `signal` 可以传给多个并发请求，`abort()` 一次性取消所有绑定在它上面的请求。
- 若请求发出**前** `signal` 已被 abort，本库直接短路 reject（`RequestError('CANCELLED')`），不再发起真实网络请求。
- 小程序运行时没有标准 `AbortController`，本库自带一份轻量 `AbortController`/`AbortSignal`（接口形态与 Web 标准一致）；取消逻辑只依赖 `aborted`/`addEventListener`/`removeEventListener`，所以自带 polyfill、Node 或未来平台原生的 `AbortSignal` 都能直接传给 `signal` 字段。

### 6.1 自定义 AbortController

`new AbortController()` 按以下顺序解析背后的构造器：

1. `globalThis.AbortController` —— 系统原生（未来平台上线时自动生效），或你全局挂载的 polyfill；
2. 库自带 `AbortControllerPolyfill` —— 兜底。

每次 `new` 都重新解析，故你任意时机 `globalThis.AbortController = YourAC` 都会在下一次构造生效。想直接用库自带的兜底实现，也可显式 `new AbortControllerPolyfill()`（已导出，便于测试或固定行为）。

```javascript
const { request, AbortController, AbortControllerPolyfill } = require('@mini-dev/request-wx');

// 方式一：全局挂载你自己的 polyfill（优先于库自带）
globalThis.AbortController = require('your-polyfill').AbortController;

// 方式二：直接用库自带兜底实现
const controller = new AbortControllerPolyfill();
```

## 7. 超时与重试

```javascript
const { request } = require('@mini-dev/request-wx');

request({
    url: 'http://127.0.0.1:8008/delay/8',
    ext: {
        timeout: 3000,   // 库级 3 秒超时，到点抛 RequestError('TIMEOUT')
        retry: 2         // 对瞬态错误（网络抖动 / 连接重置等）重试 2 次
    }
}).catch((err) => {
    if (err.code === 'TIMEOUT') { /* 超时 */ }
});
```

- `ext.timeout` 是库级 Promise 计时，到点抛 `RequestError('TIMEOUT')`。顶层 `timeout` 是原生超时（task 层中止），原样透传给 `wx.request`，不触发库级超时/重试；两者不要同时使用。
- `ext.retry` 只对**瞬态错误**重试（指数退避），终态错误（取消、域名未配置、体积超限、非法 url、ssl 等）不重试。各平台瞬态判定见平台包 `strategies.ts`，可自行替换 engine 注入。
- `err instanceof RequestError` 的错误一律视为终态不重试。
- **`ext.timeout` 是"每次尝试"超时，不是整次调用的总预算**：`retry` 在整条中间件链外层包裹，每次重试都会重跑一遍 timeout 计时器。故 `timeout` 与 `retry` 合用时，最坏总耗时 ≈ （重试次数 + 1）× `timeout` + 各次指数退避（100ms、200ms、400ms…）。例如 `timeout: 3000, retry: 2` 最坏 ≈ 3 × 3000 + (100 + 200) ms。若需要"整体截止时间"，用一个 `ext.signal` 在总时限到点时 `abort()`（同一 signal 贯穿所有重试）。

## 8. 缓存

```javascript
request({ url: 'http://127.0.0.1:8008/get', ext: { maxAge: 60000 } }); // 60 秒内重复请求命中缓存，直接 resolve
```

`ext.maxAge > 0` 启用按方法实例独享的缓存（默认容量 16，**FIFO**——按写入顺序驱逐最旧；容量可经核心 `createMethod` 的 `cacheSize` 调整）；缓存键为请求参数。缓存仅命中成功响应，失败不缓存。

> **缓存键时机**：键在拦截器之前计算（链路 `abort → cache → timeout → 方法默认拦截器 → ext.interceptors → core`），故拦截器对 `canonical` 的改动**不进**缓存键。若需让某差异影响命中，把它直接放在调用层 `canonical`，而不是在拦截器里改。
>
> **流式响应不缓存**：缓存按**响应**判定——流式响应（`Response.data` 为 `ChunkThrough` 流）不可重放，不缓存。仅微信 `enableChunked: true` 产出流式响应；支付宝/抖音忽略 `enableChunked`、响应为可重放的整段体，正常缓存。

## 9. chunked 传输

> **仅微信支持。** 支付宝 `my.request` / 抖音 `tt.request` 原生无分块事件，`enableChunked` 在这两个平台会被忽略（原样透传给原生、原生不识别亦忽略），响应体在 `success` 一次性返回（非流）。跨平台代码勿在 my/tt 期待流式。

### 9.1 enableChunked

开启 chunked 传输需添加 `enableChunked: true`（`wx.request` 官方参数）。启用后：

1. `wx.request` 的 `success` 回调等到传输全部结束才调用；
2. 首帧 headers 到达时，本库即 resolve 出 `Response`（其 `data` 为流式 `ChunkThrough`），不必等传输结束；
3. 若服务器返回并非 chunked 传输（未配 `Transfer-Encoding: chunked`），只能拿到 headers、拿不到响应体，需注意服务端返回方式（express 用 `write` + `end`）。
4. **中途取消语义不同**：chunked 下 promise 已在首帧 headers resolve（交出 `Response` 流），故请求中 `ext.signal` abort **不会**让 promise reject `CANCELLED`，而是经流的 `error` 事件体现。要捕获中途取消请监听 `res.data.on('error', …)`（与非 chunked 的 promise 级 `CANCELLED` 不同）。

```javascript
request({ url: 'http://127.0.0.1:8008/stream-with-header', enableChunked: true }).then((res) => {
    res.data.on('data', (chunk) => console.log('chunk', chunk));
    res.data.on('end', () => console.log('end'));
    res.data.on('error', (err) => console.error(err));
});
```

### 9.2 enableChunkedBuffer

本库自定义参数，默认 `true`。服务器已返回数据但还没添加 `on` 监听时，已返回的数据先缓存；第一次添加对应 event-handler 时一次性回放。之所以如此，是因为响应拦截器异步执行可能造成监听时机延迟，导致监听添加前已有 chunk 到达。

## 10. augment-only 核心用法

便捷单例是叠在核心 `createMethod` 之上的归一层。需要绕开归一、直接用 canonical 字段说话（自己组装中间件链）时，用核心——注意：augment-only **不归一**，入参用 canonical 字段名（如 `headers` 而非 wx 的 `header`），engine 再映射到 native：

```javascript
const { createMethod, createWxEngine, RequestError } = require('@mini-dev/request-wx');

const request = createMethod('request', {
    engine: createWxEngine,           // 平台 engine 工厂
    interceptors: []                  // 该方法默认洋葱拦截器（位于内置之后、单次之前）
});

// 库控制装在 ext 里，与 canonical 参数命名空间隔离；canonical 参数平铺顶层
request({
    url: 'http://x/y',
    headers: { token: 't' },           // canonical 请求头（复数），wx engine 映射为原生 header
    dataType: 'json',
    ext: { timeout: 3000, retry: 2, maxAge: 60000, signal }
}).then((res) => {
    // res 是 Response；res.data / res.headers / res.statusCode 原样
});
```

`ext.interceptors` 可单次追加洋葱拦截器（`Interceptor` 签名 `(ctx, next) => Promise<void>`，koa-compose 风格）。原生回调 `success`/`fail`/`complete` 也支持（传入则返回 `undefined`，与原生一致）。

便捷层的 `ext` 用法与此完全一致（库控制统一走 `ext`）；两层调用点的差异仅在便捷层的 `header`/`params` 归一与始终 Promise，其余顶层字段两层都原样透传、不假设原生参数。

## 11. 设计

本库与 `@mini-dev/location` 同范式：

```
平台包便捷单例 request(option)
   │  mapToCore: normalizeRequestOptions 归一(header/headers→canonical headers / params→data|url) → `ext` 透传 → canonical 平铺（顶层其余字段原样透传，不假设原生参数）
   └─► 核心 createMethod('request', { engine: () => Engine })
          └─ compose([abort?, cache?, timeout?, ...默认interceptors, ...ext.interceptors, core])
                └─ runWithRetry 包裹整条链（compose 外层）
   core ─► Engine.request(canonical, signal) ─► engine canonical↔native 映射 ─► wx.request + RequestTask
```

要点：

- **canonical 请求 / 响应（核心拥有、平台无关）**：核心定义 `CanonicalRequest`（`url`/`method`/`data`/`headers` 复数/`enableChunked`/`enableChunkedBuffer` + 平台特有字段 passthrough）与 `Response`（`data`/`headers`/`statusCode`/`cookies`/`enableChunked`）。`headers` 复数对齐 web 标准、与 `Response.headers` 自洽——**核心不隐式默认 wx**，不假定 canonical 等于任一平台原生字段名。各 engine 显式做 canonical↔native：出向 wx/tt `headers`→原生 `header`、my `headers`=原生 `headers`（identity）；入向 wx/tt `res.header`/`res.statusCode`/`res.cookies`→`Response.headers`/`statusCode`/`cookies`，my `res.status`/`res.headers`→`Response.statusCode`/`headers`（无 cookies）。
- **只增强、不归一**：核心 `createMethod` 纯透传 canonical 入参 / 响应 / 错误；归一（`header`/`headers`→canonical `headers`、`params`）只在便捷层做。原生错误形如 `{ errMsg }` 原样 reject，不包成 `Error`。
- **`ext` 命名空间隔离库控制**：`retry`/`maxAge`/`signal`/`interceptors` 只在 `ext` 生效，不污染顶层、避免未来原生新增字段撞名（location 旧版 `type` 冲突 bug 的教训）。`timeout` 是唯一重名者：顶层 `timeout` 原样作原生超时透传，`ext.timeout` 才是库级 Promise 超时，二者不并用。库不假设原生参数集合——顶层除 `ext`/回调/归一字段外一律透传。
- **取消的职责分离**：`abort` 中间件只认标准 `AbortSignal` 接口、抛 `RequestError('CANCELLED')`；真正调 `task.abort()` 中断在途请求由持有 `RequestTask` 的 engine 做（订阅 signal）。signal 保持通用、不认识 task——修正了旧版 `signal._attachTask_(task)` 让 signal 持有原生 task 的职责泄漏。
- **重试是外层 runner 不是中间件**：koa-compose 的 `next()` 只能调用一次，无法链内循环；`runWithRetry` 在 compose 外层包裹，按 `engine.isTransientError` 判定瞬态、指数退避。
- **平台即平台包**：核心平台无关、不探测、不碰 `globalThis`；`wx`/`my`/`tt` 各自的 `RequestTask` 事件名 / 瞬态判定 / chunked 能力差异全在平台包。部分小程序「构建 npm」不解析 `exports` 子路径，故拆独立单入口包而非子路径。
- **小程序运行时无标准 `AbortController`**：`new AbortController()` 按 `globalThis.AbortController`（系统原生 / 用户全局挂载的 polyfill）→ 库自带 `AbortControllerPolyfill` 兜底的顺序解析，每次 `new` 重新解析；取消逻辑只用 `aborted`/`addEventListener`/`removeEventListener`，故自带 polyfill、Node / 未来平台原生 `AbortSignal` 都能工作。兜底实现亦单独导出为 `AbortControllerPolyfill`。

## 12. 常见问题

**Q: `catch` 到的 `err` 是不是 `Error` 实例？**

分两类：库自身动作（超时 / 取消 / 方法缺失）抛 `RequestError`（是 `Error` 实例，带 `code` 字段：`TIMEOUT`/`CANCELLED`/`UNSUPPORTED`）；真正的网络失败错误来自 `wx.request` 原生 `fail`，通常是 `{ errMsg: '...' }` 普通对象，**原样透传、不包成 `Error`**。建议用 `err.code`（库源）或 `err.errMsg`（原生）判断，不要依赖 `err instanceof Error`。

**Q: 想在非小程序环境（Node 单测）里用该怎么办？**

`request` 默认依赖全局 `wx`，没有 `wx` 时调用会抛 `RequestError('UNSUPPORTED', 'No engine found')`。便捷层用 `createRequest(engine)` 注入自定义 engine；核心层用 `createMethod` 注入 `RequestEngine`（实现 `request(args, signal): Promise<Response>`），见 [10. augment-only 核心用法](#10-augment-only-核心用法)。

**Q: `headers` 设置了不生效？**

若同时设了 `header` 和 `headers`，便捷层会归一成 canonical `headers`，**由所在平台的原生字段决定谁优先**：微信 / 抖音原生用 `header`（单数），故 `header` 优先；支付宝原生用 `headers`（复数、无 `header`），故 `headers` 优先。跨端代码若想避免歧义，二者选一即可。

## 13. 示例项目

各示例工程的使用说明见其目录下的 README：

- [`sample-server`](./sample-server/README.md)：基于 Express 的本地测试服务器；
- [`sample-request-wechat`](./sample-request-wechat/README.md)：微信小程序示例工程，用微信开发者工具打开；
- [`sample-request-alipay`](./sample-request-alipay/README.md)：支付宝小程序示例工程，用支付宝小程序开发者工具打开；
- [`sample-request-douyin`](./sample-request-douyin/README.md)：抖音小程序示例工程，用抖音开发者工具打开。

## 14. 从 0.3.x 迁移

0.4.0 相对 0.3.x 是一次 breaking 重写（范式与 `@mini-dev/location` 对齐）：

- 包名由 `@mini-dev/request` 改为按平台选 `@mini-dev/request-wx` / `-my` / `-tt`（核心仍名 `@mini-dev/request`，作为平台包依赖自动引入）。
- **库控制统一只走 `ext`**：`timeout`/`retry`/`maxAge`/`signal`/`interceptors` 只在 `ext` 生效。旧版写在 option 顶层的需改为 `request({ url, ext: { timeout, retry } })`；误写顶层会被当作原生参数透传、库级能力不生效。
- **`timeout` 双轨**：顶层 `timeout` 为原生超时（task 层中止）透传，`ext.timeout` 为库级 Promise 超时，二者不要同用。
- **`method` 不再缺省**：便捷层不再写入 `GET`，交给原生默认（三平台均默认 `GET`，行为不变；`params` 归一路由仍按 GET 处理）。
- 取消错误由普通 `Error`（`errMsg: 'request:fail abort'`）改为 `RequestError`（`code: 'CANCELLED'`）；仍带 `errMsg` 字段，旧代码读 `errMsg` 不受影响。
- **便捷层仅 Promise**：`success`/`fail`/`complete` 回调在便捷层被丢弃；核心层 `createMethod` 仍支持回调（返回 `undefined`）。
- 造独立实例 / 注入自定义 engine 改用平台包导出的 `createRequest(engine?)`（不在实例上派生）。
- `params`/`headers`/拦截器/`chunked` 用法保持兼容。

## 15. 更新日志

### 0.4.0

重写为 `@mini-dev/location` 同款范式（平台无关 core + 平台包 + koa-compose 洋葱中间件 + `ext` 命名空间 + `RequestError`），相对 0.3.x 为 breaking：

1. 拆 `@mini-dev/request`（core）+ `@mini-dev/request-wx` / `-my` / `-tt`（微信 / 支付宝 / 抖音平台包），TS + tsdown 双格式 + per-format `.d.ts`，100% 覆盖率阈值；
2. 新增库级 `timeout`（`Promise.race`）/ `retry`（外层 runner + 指数退避 + 平台瞬态判定）/ `cache`（TTL + FIFO，默认容量 16、按方法实例独享）中间件；
3. **库控制统一只放 `ext`**：`timeout`/`retry`/`maxAge`/`signal`/`interceptors` 只在 `ext` 生效，不再在便捷层顶层识别/剥离；迁移 `request({ url, timeout, retry })` → `request({ url, ext: { timeout, retry } })`。`timeout` 双轨：顶层 `timeout` 为原生超时（task 层中止）透传，`ext.timeout` 为库级 Promise 超时，二者不要同用；
4. **`method` 不再缺省**：便捷层不再写入 `GET`，交给原生默认（三平台均默认 `GET`，行为不变；`params` 归一路由仍按 GET 处理）；
5. 取消重做：`AbortSignal` 接口对齐标准形态 + `AbortController` 按 `globalThis.AbortController`（系统/用户 polyfill）→ 库自带 `AbortControllerPolyfill` 兜底解析（每次 `new` 重新解析，兜底实现亦单独导出）；真正中断在途请求由 engine 订阅 signal 调 `task.abort()`，修正旧版 `signal._attachTask_(task)` 的职责泄漏；抛 `RequestError('CANCELLED')`；
6. 错误模型：`RequestError`（`code`: `TIMEOUT`/`CANCELLED`/`UNSUPPORTED`）区分库源 / 原生；原生错误原样透传；
7. `ext` 命名空间隔离库控制，避免与原生参数撞名；
8. **便捷层仅 Promise**：`success`/`fail`/`complete` 回调在便捷层被丢弃；核心层 `createMethod` 仍支持回调（返回 `undefined`，仍只剥 `ext`/回调，顶层全透传）；
9. 造独立实例 / 注入自定义 engine 改用平台包导出的 `createRequest(engine?)`（不在实例上派生）；
10. **headers 归一优先级跟随平台原生字段**：`header`/`headers` 双写时，由各平台原生 header 字段名（`nativeHeaderKey`：wx/tt `header`、my `headers`，缺省 `headers`）决定谁优先，而非写死 `header`——核心不隐式默认 wx；
11. **缓存按响应判定、流式不缓存**：流式响应（`Response.data` 为 `ChunkThrough`，仅 wx `enableChunked: true` 产出）不可重放，不缓存；支付宝/抖音忽略 `enableChunked`、响应为可重放的整段体，正常缓存；
12. **缓存键在拦截器之前计算**：链路 `abort → cache → timeout → 方法默认拦截器 → ext.interceptors → core`，故拦截器对 `canonical` 的改动不进缓存键。

### 0.3.4

1. 修正 `Response` 构造函数默认参数拼写错误（`ture` -> `true`）导致的潜在 `ReferenceError`；
2. 修正拦截器同步抛出异常无法 `.catch` 捕获，统一以 rejected Promise 返回；
3. 修正已 `abort` 的 `signal` 仍会发起真实网络请求，改为发出前短路 reject；
4. 支持同一个 `AbortSignal` 绑定并取消多个并发请求；
5. `params` 中 `null`/`undefined` 字段不再被序列化为字符串；
6. 补充 `Response`、`AbortController`/`AbortSignal` 单测。
