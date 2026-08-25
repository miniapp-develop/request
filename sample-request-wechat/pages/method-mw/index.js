// @mini-dev/request 微信示例 - 方法级拦截器（augment-only createMethod 路径）
//
// 这是与便捷层完全不同的另一条 API 路径：直接用核心 createMethod 包一个原生方法，
// 原生入参/响应/错误原样透传（不经归一），库控制走 ext，拦截器是 koa 洋葱中间件 (ctx, next) => Promise。
//
// 拦截器链：abort → cache → timeout → 方法默认 interceptors → ext.interceptors → core，retry 在最外层包裹。
// 方法级拦截器能做便捷层两段式做不到的事：改 ctx.canonical、改 ctx.result、不调 next 短路核心、包裹观测内层链。
//
// 注入点两处：
//   ① createMethod(name, { interceptors }) 方法默认（实例级共享，位于内置 abort/cache/timeout 之后）；
//   ② ext.interceptors 单次追加（位于方法默认之后、core 之前）。
const { createMethod, createWxEngine, Response } = require('@mini-dev/request-wx');
const formatError = require('../../utils/formatError');

const BASE = 'http://127.0.0.1:8008';

// 方法默认拦截器（实例级共享）：
//   logInterceptor —— 洋葱外层：包裹 next 计时，证明是洋葱（enter 在前、exit 在后）。
//   authInterceptor —— 改 ctx.canonical 请求侧：注入公共 header（所有调用共享）。
const logInterceptor = async (ctx, next) => {
    const t = Date.now();
    console.log('[mw] enter', ctx.canonical.url);
    await next();                 // 跑完整条内层链（abort/cache/timeout/ext.interceptors/core）
    console.log('[mw] exit', ctx.canonical.url, Date.now() - t, 'ms');
};

const authInterceptor = async (ctx, next) => {
    ctx.canonical.headers = { ...(ctx.canonical.headers || {}), 'X-Token': 'shared-token' };
    await next();
};

// 方法实例：engine 工厂懒绑 wx 全局；interceptors 为方法默认。
const method = createMethod('request', {
    engine: createWxEngine,
    interceptors: [logInterceptor, authInterceptor]
});

Page({
    data: {
        result: '点击下方按钮（需先启动 sample-server）\n方法级拦截器 = koa 洋葱，能短路核心、包裹内层链'
    },

    log(text) {
        console.log(text);
        this.setData({ result: text });
    },

    // ① 方法默认拦截器：log（外层计时）+ auth（注入 X-Token）。服务端回显收到的 header。
    onTapDefault() {
        this.log('方法默认拦截器演示：log + auth 注入 X-Token…');
        method({
            url: `${BASE}/get`,
            method: 'GET',
            headers: { 'X-From': 'sample' }    // canonical 复数 headers，不经便捷层归一
        })
            .then((res) => {
                const echoed = res.data && res.data.headers ? res.data.headers : {};
                this.log(
                    `statusCode: ${res.statusCode}\n` +
                    `服务端收到的 X-Token: ${echoed['x-token']}（auth 注入）\n` +
                    `服务端收到的 X-From: ${echoed['x-from']}\n` +
                    `（log 在 enter/exit 各打一行，见 console = 洋葱包裹）`
                );
            })
            .catch((err) => this.log(`失败: ${formatError(err)}`));
    },

    // ② 单次追加 ext.interceptors：注入 X-Per-Call；await next() 后改 ctx.result.headers。
    //    位置在方法默认之后、core 之前；只影响本次调用。
    onTapPerCall() {
        this.log('单次追加拦截器演示：ext.interceptors 注入 X-Per-Call + 改响应头…');
        method({
            url: `${BASE}/get`,
            method: 'GET',
            ext: {
                interceptors: [
                    async (ctx, next) => {
                        ctx.canonical.headers = { ...ctx.canonical.headers, 'X-Per-Call': 'once' };
                        await next();
                        // 响应侧：next 返回后 ctx.result 是 core 的 Response
                        ctx.result.headers['X-Injected'] = 'by-method-mw';
                    }
                ]
            }
        })
            .then((res) => {
                this.log(
                    `statusCode: ${res.statusCode}\n` +
                    `服务端收到 X-Per-Call: ${res.data.headers['x-per-call']}\n` +
                    `客户端 res.headers['X-Injected']: ${res.headers['X-Injected']}\n` +
                    `（ext.interceptors 仅本次调用生效）`
                );
            })
            .catch((err) => this.log(`失败: ${formatError(err)}`));
    },

    // ③ 短路核心：不调 next()，直接塞 ctx.result，core 不执行（不发网络）。
    //    便捷层两段式拦截器做不到——它们在 method() 调用之外，无法跳过核心链。
    onTapShortCircuit() {
        this.log('短路核心演示：命中 /mock-me 时不调 next，直接返回 mock…');
        method({
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
                            return;            // 不 await next()，core 不执行
                        }
                        await next();
                    }
                ]
            }
        })
            .then((res) => {
                this.log(`statusCode: ${res.statusCode}\ndata: ${res.data}\n（未发网络，核心被短路）`);
            })
            .catch((err) => this.log(`失败: ${formatError(err)}`));
    },

    // ④ retryDelay：createMethod 选项（非 ext），注入自定义退避函数。runWithRetry 默认按 2^attempt×100ms
    //    计算等待时长并调 delay(ms)；此处自定义 delay 记录每次等待，展示退避节奏 100/200/400ms。
    onTapRetryDelay() {
        const schedule = [];
        const customDelay = (ms) => {
            schedule.push(ms);
            console.log('[mw] retryDelay wait', ms);
            return new Promise((r) => setTimeout(r, ms));
        };
        const retryMethod = createMethod('request', {
            engine: createWxEngine,
            retryDelay: customDelay
        });
        this.log('retryDelay 演示：retry 3 + 自定义退避，请求 /reset（连接被销毁，瞬态原生错误）…');
        retryMethod({
            url: `${BASE}/reset`,
            method: 'GET',
            ext: { retry: 3 }            // 不加 timeout：要的是原生瞬态错误而非库级 TIMEOUT（终态）
        })
            .then((res) => this.log(`不应到达：${res.statusCode}`))
            .catch((err) => {
                this.log(
                    `重试结束: ${formatError(err)}\n` +
                    `退避节奏(每次重试前等待): ${schedule.join('ms, ')}ms\n` +
                    `（retryDelay 是 createMethod 选项，非 ext；ms 由库按 2^attempt×100 计算）`
                );
            });
    },

    // ⑤ 包裹内层链：方法默认拦截器 try/catch 包 next，可观测/加工内层链（abort/cache/timeout/retry）抛错。
    //    这里触发 ext.timeout，观察内层抛 RequestError(TIMEOUT) 被外层拦截器捕获。
    onTapGuard() {
        const guardMethod = createMethod('request', {
            engine: createWxEngine,
            interceptors: [
                async (ctx, next) => {
                    try {
                        await next();
                    } catch (e) {
                        console.log('[mw] guard caught inner error', e && e.code, e && e.message);
                        throw e;     // 重新抛出，不吞错；仅演示可观测
                    }
                }
            ]
        });
        this.log('包裹内层链演示：guard 拦截器 try/catch 包 next，触发 timeout 观测…');
        guardMethod({
            url: `${BASE}/delay/8`,
            method: 'GET',
            ext: { timeout: 500 }
        })
            .then((res) => this.log(`不应到达：${res.statusCode}`))
            .catch((err) => this.log(`guard 捕获内层错误: ${formatError(err)}\n（方法级拦截器能包裹 abort/cache/timeout/retry 整条内层链）`));
    }
});
