# @mini-dev/request

跨微信 / 支付宝 / 抖音小程序 HTTP 请求库的**平台无关核心**（TypeScript）。

> 通常无需直接安装本包——它会作为平台包（[`@mini-dev/request-wx`](https://www.npmjs.com/package/@mini-dev/request-wx) / [`-my`](https://www.npmjs.com/package/@mini-dev/request-my) / [`-tt`](https://www.npmjs.com/package/@mini-dev/request-tt)）的依赖自动引入。下面介绍的是「augment-only 核心用法」，面向需要绕开便捷层归一、直接用 canonical 字段组装中间件链的消费方。

提供的能力：

- `createMethod(name, { engine, interceptors, cacheSize, retryDelay })` —— 把一个原生网络方法包成增强方法实例（洋葱中间件链 + 独享缓存 + retry 外层）。
- 中间件：`abort` / `cache` / `timeout` / `retry`（由 `ext` 激活，全省略即纯透传）。
- `RequestError`（`code`: `TIMEOUT` / `CANCELLED` / `UNSUPPORTED`）、`Response`、`ChunkThrough`。
- `AbortController` / `AbortControllerPolyfill` / `AbortSignal`（按 `globalThis.AbortController` → 库自带 polyfill 兜底解析）。
- `normalizeRequestOptions` / `createConvenienceRequest`（便捷层归一与实例构造，平台包默认单例即基于此）。

## 安装

```shell script
npm i @mini-dev/request      # 通常由平台包自动引入，手动安装仅 augment-only 场景需要
```

## 快速开始（augment-only）

核心 **不归一**：入参用 canonical 字段名（如 `headers` 而非某平台原生 `header`），engine 负责把它映射到原生。库控制统一装在保留字段 `ext`，与原生参数命名空间隔离。

```javascript
const { createMethod, RequestError } = require('@mini-dev/request');
// engine 需由平台包提供，例如：
// const { createWxEngine } = require('@mini-dev/request-wx');

const request = createMethod('request', {
    engine: createWxEngine,          // 平台 engine 工厂（首次调用懒调）
    interceptors: []                 // 该方法默认的洋葱拦截器
});

request({
    url: 'http://x/y',
    headers: { token: 't' },          // canonical 请求头（复数），engine 映射为原生 header
    ext: { timeout: 3000, retry: 2, maxAge: 60000 }
}).then((res) => {
    // res 是 Response：res.data / res.headers / res.statusCode 原样透传
}).catch((err) => {
    if (err instanceof RequestError) { /* 库源错误，看 err.code */ }
    else { /* 原生错误原样透传，形如 { errMsg } */ }
});
```

`ext.interceptors` 可单次追加洋葱拦截器（`Interceptor` 签名 `(ctx, next) => Promise<void>`，koa-compose 风格）；原生回调 `success` / `fail` / `complete` 也支持（传入则返回 `undefined`，与原生一致）。

## 完整文档

本包是 [`minidev-request`](https://github.com/xesam/minidev-request) monorepo 的核心。完整设计、API、迁移指南与示例见仓库 [README](https://github.com/xesam/minidev-request#readme)。

## License

ISC
