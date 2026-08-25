# sample-request-alipay

支付宝小程序示例（单页 `pages/index`），便捷层 API 与微信示例一致。用支付宝小程序开发者工具打开，运行前先启动 [`sample-server`](../sample-server)，在工程目录执行 `npm i`，再在 IDE 执行「同步小程序」（同步 npm 包）。

## 按钮

| 按钮 | 说明 |
| --- | --- |
| 基础 GET / POST | `params`/`data`/`headers` 用法（支付宝原生用 `headers`/`status`，engine 自动映射） |
| canonical headers | 复数 `headers` 写法，演示跨平台一致性（my 原生即 `headers`，engine 出向 identity） |
| 拦截器 | `createRequest()` + 两段式拦截器（A/B 对演示洋葱序：后注册者在外层） |
| 取消 / 超时 / 重试 / 缓存 | `AbortController`、`ext.timeout`、`ext.retry`、`ext.maxAge` |
| 错误模型对照 | `RequestError`（带 `code`）vs 原生错误原样透传；HTTP 非双百状态码仍走 success |
| 独立实例 | `createRequest()` |
| 方法级拦截器 | augment-only `createMethod` + koa 洋葱：方法默认 / 短路核心 / `retryDelay` |

> 支付宝 `my.request` 原生不支持 chunked 流式，故本示例不含 chunked 演示。
