# @mini-dev/request-my

跨微信 / 支付宝 / 抖音小程序 HTTP 请求库的**支付宝（my）平台包**（TypeScript）。

在原生 `my.request` 语义之上叠加增强：**Promise 化、两段式拦截器、取消、超时、重试、缓存**。原生入参 / 响应 / 错误原样透传，只增强、不归一。

> 范式与同仓 [`@mini-dev/location`](https://github.com/xesam/minidev-location) 一致：平台无关核心（`@mini-dev/request`，作为本包依赖自动引入）+ 平台包。

平台差异在 engine 内收敛：支付宝 `my.request` 原生用 `headers` / `status`（与 canonical 一致，engine 出向 identity、无字段映射），入向 `res.status` → `Response.statusCode`、`res.headers` → `Response.headers`（无 cookies）。支付宝原生无分块事件，`enableChunked` 被忽略、原样透传，响应体在 `success` 一次性返回（非流）——**不支持 chunked 流式**。

## 安装

```shell script
npm i @mini-dev/request-my
```

安装完成后，在支付宝小程序开发者工具里执行「同步小程序」（同步 npm 包），否则小程序无法识别 `node_modules` 里的包。

## 快速开始

```javascript
const { request } = require('@mini-dev/request-my');

request({
    url: 'http://127.0.0.1:8008/get',
    method: 'get',
    params: { name: 'xesam' }
})
    .then((res) => {
        console.log(res.data);
        console.log(res.statusCode);
        console.log(res.headers);
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
| `createMyEngine` | my 引擎工厂（augment-only `createMethod` 用） |
| `isTransientError` | my 瞬态错误判定（`err.error` 数值码：2/4/14/19/20 终态，其余重试） |
| `createMethod` / `RequestError` / `Response` / `AbortController` / `AbortControllerPolyfill` / `AbortSignal` / `normalizeRequestOptions` | 再导出核心能力 |

## 完整文档

本包是 [`minidev-request`](https://github.com/xesam/minidev-request) monorepo 的支付宝平台包。完整设计、API、迁移指南与示例见仓库 [README](https://github.com/xesam/minidev-request#readme)，支付宝示例工程见 [`sample-request-alipay`](https://github.com/xesam/minidev-request/tree/master/sample-request-alipay)。

## License

ISC
