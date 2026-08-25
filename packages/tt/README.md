# @mini-dev/request-tt

跨微信 / 支付宝 / 抖音小程序 HTTP 请求库的**抖音（tt）平台包**（TypeScript）。

在原生 `tt.request` 语义之上叠加增强：**Promise 化、两段式拦截器、取消、超时、重试、缓存**。原生入参 / 响应 / 错误原样透传，只增强、不归一。

> 范式与同仓 [`@mini-dev/location`](https://github.com/xesam/minidev-location) 一致：平台无关核心（`@mini-dev/request`，作为本包依赖自动引入）+ 平台包。

平台差异在 engine 内收敛：抖音 `tt.request` 原生用 `header` / `statusCode`，engine 出向 canonical `headers` → 原生 `header`，入向 `res.header` → `Response.headers`、`res.statusCode` → `Response.statusCode`（与 wx 同形）。抖音原生无分块事件，`enableChunked` 被忽略、原样透传，响应体在 `success` 一次性返回（非流）——**不支持 chunked 流式**。官方文档未列 success 回调的 `header` / `cookies`，`res.headers` / `res.cookies` 在抖音上通常为 `undefined`。

## 安装

```shell script
npm i @mini-dev/request-tt
```

安装完成后，在抖音开发者工具里执行「同步 npm 包」，否则小程序无法识别 `node_modules` 里的包。

## 快速开始

```javascript
const { request } = require('@mini-dev/request-tt');

request({
    url: 'http://127.0.0.1:8008/get',
    method: 'get',
    params: { name: 'xesam' }
})
    .then((res) => {
        console.log(res.data);
        console.log(res.statusCode);
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
| `createTtEngine` | tt 引擎工厂（augment-only `createMethod` 用） |
| `isTransientError` | tt 瞬态错误判定（`errMsg` 文本，与 wx 同形） |
| `createMethod` / `RequestError` / `Response` / `AbortController` / `AbortControllerPolyfill` / `AbortSignal` / `normalizeRequestOptions` | 再导出核心能力 |

## 完整文档

本包是 [`minidev-request`](https://github.com/xesam/minidev-request) monorepo 的抖音平台包。完整设计、API、迁移指南与示例见仓库 [README](https://github.com/xesam/minidev-request#readme)，抖音示例工程见 [`sample-request-douyin`](https://github.com/xesam/minidev-request/tree/master/sample-request-douyin)。

## License

ISC
