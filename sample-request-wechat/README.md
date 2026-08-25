# sample-request-wechat

微信小程序示例工程，用微信开发者工具打开。运行前先启动 [`sample-server`](../sample-server)，在工程目录执行 `npm i`，再在开发者工具执行「工具 -> 构建 npm」。

## 页面

| 页面 | 说明 |
| --- | --- |
| `pages/methods` | GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD/TRACE/CONNECT 等方法，及 GET 下 `params`/`data` 拼接 |
| `pages/control` | 请求超时（`ext.timeout`）与主动取消（`AbortController`） |
| `pages/stream` | chunked 流式传输：是否携带响应头、`enableChunkedBuffer` 缓存开关、中途取消 |
| `pages/custom` | `createRequest()` 创建独立实例并附加专属拦截器 |
| `pages/method-mw` | augment-only `createMethod` + **方法级拦截器**（koa 洋葱：方法默认 / `ext.interceptors` 单次追加 / 短路核心 / 包裹内层链 / `retryDelay`） |
