# @mini-dev/request-wx

跨微信 / 支付宝 / 抖音小程序 HTTP 请求库的**微信（wx）平台包**（TypeScript）。

在原生 `wx.request` 语义之上叠加增强：**Promise 化、两段式拦截器、取消、超时、重试、缓存、chunked 流式**。原生入参 / 响应 / 错误原样透传，只增强、不归一。**唯一支持 chunked 流式**（`onHeadersReceived` / `onChunkReceived`）的平台包。

> 范式与同仓 [`@mini-dev/location`](https://github.com/xesam/minidev-location) 一致：平台无关核心（`@mini-dev/request`，作为本包依赖自动引入）+ 平台包。

## 安装

```shell script
npm i @mini-dev/request-wx
```

安装完成后，在微信开发者工具里执行一次「工具 → 构建 npm」，否则小程序无法识别 `node_modules` 里的包。

## 快速开始

```javascript
const { request } = require('@mini-dev/request-wx');

// 参数与 wx.request 基本一致，但返回 Promise
request({
    url: 'http://127.0.0.1:8008/get',
    method: 'get',
    params: { name: 'xesam' }
})
    .then((res) => {
        console.log(res.data);       // 原生 wx.request 的 res.data，原样透传
        console.log(res.statusCode);
        console.log(res.headers);    // 等价于原生 res.header
    })
    .catch((err) => console.error(err));
```

库级控制（超时 / 重试 / 缓存 / 取消 / 拦截器）统一装在保留字段 `ext` 里，与原生参数隔离：

```javascript
request({
    url: 'http://127.0.0.1:8008/delay/8',
    ext: { timeout: 3000, retry: 2, maxAge: 60000 }
});
```

## 主要导出

| 导出 | 说明 |
| --- | --- |
| `request` | 默认便捷单例（Promise + 两段式拦截器） |
| `createRequest(engine?)` | 造独立实例 / 注入自定义 engine |
| `createWxEngine` | wx 引擎工厂（augment-only `createMethod` 用） |
| `isTransientError` | wx 瞬态错误判定（重试用） |
| `createMethod` / `RequestError` / `Response` / `ChunkThrough` / `AbortController` / `AbortControllerPolyfill` / `AbortSignal` / `normalizeRequestOptions` | 再导出核心能力 |

## 完整文档

本包是 [`minidev-request`](https://github.com/xesam/minidev-request) monorepo 的微信平台包。完整设计、API、迁移指南与示例见仓库 [README](https://github.com/xesam/minidev-request#readme)，微信示例工程见 [`sample-request-wechat`](https://github.com/xesam/minidev-request/tree/master/sample-request-wechat)。

## License

ISC
