// @mini-dev/request 微信示例 - 取消 / 超时 / 重试 / 缓存 / 错误模型
//
// 库控制统一走 ext（与核心层一致）：ext.timeout / ext.signal / ext.retry / ext.maxAge / ext.interceptors。
// 错误模型：库自身动作抛 RequestError（code: TIMEOUT / CANCELLED / UNSUPPORTED）；原生错误原样透传（{ errMsg }，无 code）。
// HTTP 非 2xx 不算错误——仍走 success，statusCode 原样透传，由消费方自行判断。
const { request, AbortController } = require('@mini-dev/request-wx');
const formatError = require('../../utils/formatError');

const BASE = 'http://127.0.0.1:8008';

Page({
    data: {
        result: '点击下方按钮（需先启动 sample-server）'
    },

    log(text) {
        console.log(text);
        this.setData({ result: text });
    },

    // ===== 超时：库级 ext.timeout → RequestError(TIMEOUT) =====
    onTapTimeout() {
        this.log('timeout 演示：ext.timeout 3000，请求 delay/8…');
        request({ url: `${BASE}/delay/8`, ext: { timeout: 3000 } })
            .then((res) => this.log(`不应到达：${res.statusCode}`))
            .catch((err) => this.log(`超时: ${formatError(err)}`));
    },

    // ===== 取消：ext.signal → RequestError(CANCELLED)，engine 调 task.abort() 真正中断在途 =====
    onTapAbort() {
        this.log('abort 演示：2s 后 abort…');
        const controller = new AbortController();
        request({ url: `${BASE}/delay/8`, ext: { signal: controller.signal } })
            .then((res) => this.log(`不应到达：${res.statusCode}`))
            .catch((err) => this.log(`取消: ${formatError(err)}`));
        setTimeout(() => controller.abort(), 2000);
    },

    // ===== 重试：ext.retry，仅对「瞬态原生错误」重试；RequestError（超时/取消）为终态不重试 =====
    // 用 /reset（服务端销毁连接，TCP reset = 瞬态原生错误）触发：retry 重试 3 次（退避 100/200/400ms）后仍失败。
    // 注意：若加 ext.timeout，库级 timeout 会先抛 RequestError(TIMEOUT)（终态）→ 不重试，故此处不加 timeout。
    onTapRetry() {
        this.log('retry 演示：retry 3，请求 /reset（连接被销毁 = 瞬态原生错误）…');
        request({ url: `${BASE}/reset`, ext: { retry: 3 } })
            .then((res) => this.log(`不应到达：${res.statusCode}`))
            .catch((err) => this.log(`重试结束: ${formatError(err)}\n（瞬态原生错误重试 3 次后仍失败；RequestError 超时/取消为终态不重试）`));
    },

    // ===== 缓存：ext.maxAge，连调第二次命中缓存（明显更快） =====
    onTapCache() {
        this.log('cache 演示：ext.maxAge 5000，连调两次…');
        const t1 = Date.now();
        request({ url: `${BASE}/get`, method: 'GET', ext: { maxAge: 5000 } })
            .then(() => {
                const t2 = Date.now();
                return request({ url: `${BASE}/get`, method: 'GET', ext: { maxAge: 5000 } }).then(() => {
                    const t3 = Date.now();
                    this.log(`缓存: 第1次 ${t2 - t1}ms / 第2次 ${t3 - t2}ms（命中则第2次明显更快）`);
                });
            })
            .catch((err) => this.log(`缓存演示失败: ${formatError(err)}`));
    },

    // ===== 错误模型对照：HTTP 500 非 2xx 不算错误，走 success，statusCode 透传 =====
    onTapHttpError() {
        this.log('HTTP 错误码演示：请求 /status/500（库不把 HTTP 状态码当错误）…');
        request({ url: `${BASE}/status/500`, method: 'GET' })
            .then((res) => {
                this.log(`走 success（非 reject）\nstatusCode: ${res.statusCode}\n（库不归一 HTTP 状态码，消费方自行判断）`);
            })
            .catch((err) => this.log(`不应 reject: ${formatError(err)}`));
    },

    // ===== 错误模型对照：原生网络错误（连接被销毁）原样透传，无 code =====
    onTapNativeError() {
        this.log('原生错误演示：请求 /reset（连接被销毁，TCP reset）…');
        request({ url: `${BASE}/reset`, method: 'GET' })
            .then((res) => this.log(`不应到达：${res.statusCode}`))
            .catch((err) => this.log(`原生错误: ${formatError(err)}`));
    }
});
