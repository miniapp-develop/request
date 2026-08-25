# Sample Server

基于 Express 的本地测试服务器，供 `sample-request-wechat` / `sample-request-alipay` / `sample-request-douyin` 三个示例工程共用。

## 接口

| 接口 | 说明 |
| --- | --- |
| `/get`、`/post`、`/put`、`/patch`、`/delete` | 模拟 httpbin.org 风格回显接口，返回 `args`/`data`/`headers`/`method`/`url` |
| `/delay/:seconds` | 延迟指定秒数（最长 10 秒）后返回，演示超时 / 取消 |
| `/plain-with-header`、`/plain-without-header` | 一次性返回多段文本，演示 `Transfer-Encoding: chunked` 响应头影响 |
| `/stream-with-header`、`/stream-without-header` | 以固定间隔持续推送数据，模拟真实流式接口 |
| `/stream-timeout` | 不返回任何响应，演示超时 |
| `/stream-hang-up` | 持续推送但从不结束，演示中途取消 |
| `/status/:code` | 返回指定 HTTP 状态码（不抛错），演示「库不把 HTTP 状态码当错误」——非 2xx 仍走 success、`statusCode` 原样透传 |
| `/reset` | 立即销毁连接（TCP reset），演示重试（瞬态原生错误才重试）与「原生错误原样透传」 |

## 运行

```shell script
npm i
npm run dev        # node >= 18；node > 22 用 npm run dev22
```

默认监听 `http://127.0.0.1:8008`。
