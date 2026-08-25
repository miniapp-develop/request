// @mini-dev/request 支付宝小程序示例（便捷层 + augment-only 两条 API 路径）
//
// 平台由独立包选定（@mini-dev/request-my），不探测；import 不会抛错。
// 便捷层 API：Promise + 两段式拦截器 + 取消 + 超时 + 重试 + 缓存（库控制统一走 ext）。
// augment-only：直接用核心 createMethod + createMyEngine，原生入参/响应/错误原样透传，方法级拦截器是 koa 洋葱。
// 支付宝 my.request 原生不支持 chunked 流式，故本示例不含 chunked 演示。
// 接口地址指向自带的 sample-server（http://127.0.0.1:8008），需先启动它。
import { request, createRequest, createMethod, createMyEngine, AbortController, RequestError, Response } from '@mini-dev/request-my';

const BASE = 'http://127.0.0.1:8008';

function formatError(e) {
    if (e instanceof RequestError) {
        return `RequestError(code=${e.code}): ${e.message || ''}  ← 库自身动作`;
    }
    const native = e && (e.errMsg || e.errorMessage || e.error);
    if (native !== undefined) return `原生错误原样透传: ${native}  ← 无 code，非 RequestError`;
    return (e && e.message) || String(e);
}

Page({
    data: {
        result: '点击下方按钮发起请求（需先启动 sample-server）'
    },

    onLog(text) {
        console.log(text);
        this.setData({ result: text });
    },

    // ===== 1. 基础请求 =====
    async onTapGet() {
        this.onLog('GET 请求中…');
        try {
            const res = await request({
                url: `${BASE}/get`,
                method: 'GET',
                params: { name: 'xesam', from: 'alipay' }
            });
            this.onLog(`GET ${res.statusCode}\n${JSON.stringify(res.data)}`);
        } catch (e) {
            this.onLog(`GET 失败: ${formatError(e)}`);
        }
    },

    async onTapPost() {
        this.onLog('POST 请求中…');
        try {
            const res = await request({
                url: `${BASE}/post`,
                method: 'POST',
                data: { name: 'xesam', age: 18 },
                headers: { 'X-From': 'alipay' }
            });
            this.onLog(`POST ${res.statusCode}\n${JSON.stringify(res.data)}`);
        } catch (e) {
            this.onLog(`POST 失败: ${formatError(e)}`);
        }
    },

    // canonical headers 跨平台一致性：同一份复数 headers 写法，三平台都能正确发出与读回。
    // my 原生即用 headers（复数），与 canonical 一致 → engine 出向 identity（无字段映射）。
    async onTapCanonical() {
        this.onLog('canonical headers 演示：复数 headers 写法…');
        try {
            const res = await request({
                url: `${BASE}/get`,
                method: 'GET',
                headers: { 'X-Custom': 'canonical-headers' }
            });
            this.onLog(`statusCode: ${res.statusCode}\n服务端收到 X-Custom: ${res.data && res.data.headers && res.data.headers['x-custom']}\n客户端 res.headers: ${JSON.stringify(res.headers || {})}`);
        } catch (e) {
            this.onLog(`canonical 演示失败: ${formatError(e)}`);
        }
    },

    // ===== 2. 两段式拦截器洋葱序 =====
    async onTapInterceptor() {
        const req = createRequest();
        const order = [];
        req.addRequestInterceptor((o) => { order.push('reqA'); return o; })
            .addRequestInterceptor((o) => { order.push('reqB'); return o; });
        req.addResponseInterceptor((res) => { order.push('resA'); return res; })
            .addResponseInterceptor((res) => { order.push('resB'); return res; });
        this.onLog('拦截器洋葱序：注册 A→B，观察执行序…');
        try {
            const res = await req({ url: `${BASE}/get`, method: 'GET' });
            this.onLog(`执行序:\n${order.join(' → ')}\n（reqB 先 / resB 后 = 后注册者作为外层）\nstatusCode: ${res.statusCode}`);
        } catch (e) {
            this.onLog(`拦截器示例失败: ${formatError(e)}`);
        }
    },

    // ===== 3. 取消 / 超时 / 重试 / 缓存 =====
    async onTapAbort() {
        this.onLog('取消演示：1s 后 abort…');
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 1000);
        try {
            await request({ url: `${BASE}/delay/8`, ext: { signal: controller.signal } });
            this.onLog('取消演示：不应到达');
        } catch (e) {
            this.onLog(`取消演示: ${formatError(e)}`);
        }
    },

    async onTapTimeout() {
        this.onLog('超时演示：ext.timeout 500，请求 delay/8…');
        try {
            await request({ url: `${BASE}/delay/8`, ext: { timeout: 500 } });
            this.onLog('超时演示：不应到达');
        } catch (e) {
            this.onLog(`超时演示: ${formatError(e)}`);
        }
    },

    // 重试：仅对「瞬态原生错误」重试；RequestError（超时/取消）为终态不重试。
    // 用 /reset（服务端销毁连接，TCP reset = 瞬态原生错误）触发，retry 3 次（退避 100/200/400ms）后仍失败。不加 timeout。
    async onTapRetry() {
        this.onLog('重试演示：retry 3，请求 /reset（连接被销毁 = 瞬态原生错误）…');
        try {
            await request({ url: `${BASE}/reset`, ext: { retry: 3 } });
            this.onLog('重试演示：不应到达');
        } catch (e) {
            this.onLog(`重试演示: ${formatError(e)}\n（瞬态原生错误重试 3 次后仍失败）`);
        }
    },

    async onTapCache() {
        this.onLog('缓存演示：maxAge 5000，连调两次…');
        try {
            const t1 = Date.now();
            await request({ url: `${BASE}/get`, method: 'GET', ext: { maxAge: 5000 } });
            const t2 = Date.now();
            await request({ url: `${BASE}/get`, method: 'GET', ext: { maxAge: 5000 } });
            const t3 = Date.now();
            this.onLog(`缓存: 第1次 ${t2 - t1}ms / 第2次 ${t3 - t2}ms（命中则第2次明显更快）`);
        } catch (e) {
            this.onLog(`缓存演示失败: ${formatError(e)}`);
        }
    },

    // ===== 4. 错误模型对照 =====
    async onTapHttpError() {
        this.onLog('HTTP 错误码演示：请求 /status/500（库不把 HTTP 状态码当错误）…');
        try {
            const res = await request({ url: `${BASE}/status/500`, method: 'GET' });
            this.onLog(`走 success（非 reject）\nstatusCode: ${res.statusCode}\n（库不归一 HTTP 状态码，消费方自行判断）`);
        } catch (e) {
            this.onLog(`不应 reject: ${formatError(e)}`);
        }
    },

    async onTapNativeError() {
        this.onLog('原生错误演示：请求 /reset（连接被销毁，原样透传）…');
        try {
            await request({ url: `${BASE}/reset`, method: 'GET' });
            this.onLog('原生错误演示：不应到达');
        } catch (e) {
            this.onLog(`原生错误: ${formatError(e)}`);
        }
    },

    // ===== 5. 独立实例 =====
    async onTapCreate() {
        const req = createRequest();
        req.addResponseInterceptor((res) => {
            console.log('[独立实例 res]', res.statusCode);
            return res;
        });
        this.onLog('独立实例演示中…');
        try {
            const res = await req({ url: `${BASE}/get`, method: 'GET' });
            this.onLog(`独立实例: ${res.statusCode}`);
        } catch (e) {
            this.onLog(`独立实例失败: ${formatError(e)}`);
        }
    },

    // ===== 6. 方法级拦截器（augment-only createMethod 路径）=====
    // 方法级拦截器 = koa 洋葱 (ctx, next)，链：abort→cache→timeout→方法默认→ext.interceptors→core，retry 外层。
    // 能做便捷层两段式做不到的事：改 ctx.canonical、改 ctx.result、不调 next 短路核心、包裹观测内层链。
    async onTapMwDefault() {
        const method = createMethod('request', {
            engine: createMyEngine,
            interceptors: [
                async (ctx, next) => { console.log('[mw] enter', ctx.canonical.url); await next(); console.log('[mw] exit'); },
                async (ctx, next) => { ctx.canonical.headers = { ...(ctx.canonical.headers || {}), 'X-Token': 'shared' }; await next(); }
            ]
        });
        this.onLog('方法默认拦截器演示：log + auth 注入 X-Token…');
        try {
            const res = await method({ url: `${BASE}/get`, method: 'GET', headers: { 'X-From': 'sample' } });
            this.onLog(`statusCode: ${res.statusCode}\n服务端收到 X-Token: ${res.data.headers['x-token']}\n（log 在 enter/exit 各打一行 = 洋葱包裹，见 console）`);
        } catch (e) {
            this.onLog(`方法默认失败: ${formatError(e)}`);
        }
    },

    async onTapMwShortCircuit() {
        const method = createMethod('request', { engine: createMyEngine });
        this.onLog('短路核心演示：命中 /mock-me 时不调 next…');
        try {
            const res = await method({
                url: `${BASE}/mock-me`,
                method: 'GET',
                ext: {
                    interceptors: [
                        async (ctx, next) => {
                            if (String(ctx.canonical.url).includes('/mock-me')) {
                                const mock = new Response();
                                mock.setHeaders({}, 200);
                                mock.resolve('mocked by method-level interceptor');
                                ctx.result = mock;
                                return;
                            }
                            await next();
                        }
                    ]
                }
            });
            this.onLog(`statusCode: ${res.statusCode}\ndata: ${res.data}\n（未发网络，核心被短路 — 两段式做不到）`);
        } catch (e) {
            this.onLog(`短路失败: ${formatError(e)}`);
        }
    },

    async onTapMwRetryDelay() {
        const schedule = [];
        const customDelay = (ms) => { schedule.push(ms); return new Promise((r) => setTimeout(r, ms)); };
        const method = createMethod('request', { engine: createMyEngine, retryDelay: customDelay });
        this.onLog('retryDelay 演示：retry 3 + 自定义退避，请求 /reset…');
        try {
            await method({ url: `${BASE}/reset`, method: 'GET', ext: { retry: 3 } });
            this.onLog('retryDelay：不应到达');
        } catch (e) {
            this.onLog(`重试结束: ${formatError(e)}\n退避节奏: ${schedule.join('ms, ')}ms\n（retryDelay 是 createMethod 选项，非 ext）`);
        }
    }
});
