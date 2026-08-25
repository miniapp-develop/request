// 用 mock 的平台全局把各示例驱动一遍真实构建产物（dist），验证「构建 npm」依赖接线 + 透传语义。
//
// Monorepo 布局下：示例直接依赖三件——平台包（如 @mini-dev/request-wx，workspace:* → packages/wx）、
// 核心 @mini-dev/request（workspace:* → packages/core）、koa-compose（catalog:）。原因：微信「构建 npm」
// 只处理示例顶层 node_modules 里的包，不钻进 pnpm 嵌套 node_modules 找传递依赖；若核心 / koa-compose
// 不是示例直接依赖，就不会被构建进 miniprogram_npm，运行时 require 会回退到相对路径而失败。
// 运行前需 `pnpm install`（填充示例 node_modules 的 workspace 软链）+ `pnpm run build`（产出各包 dist）。
//
// 用 module.createRequire 从示例目录解析 @mini-dev/request-<platform>，确保走的正是示例 node_modules 里的产物
// （即「构建 npm」会打包的那份），而不是 scripts 目录解析到的另一份。
//
// 三个平台示例（wechat / alipay / douyin）共用一套驱动：success/fail/abort/拦截器/AbortController 解析。
// 平台差异由 NATIVE 表描述：原生 success/fail 形状（engine 映射成统一 Response）、是否支持 chunked。
// chunked 流式是 wx 专有能力（my/tt 原生无 onHeadersReceived/onChunkReceived），故仅 wx 跑 chunked 用例。
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };
const expect = (cond, m) => (cond ? ok(m) : bad(m));

const REPO = path.resolve(__dirname, '..');

// 示例名 → 该示例应直接依赖的平台包。运行期三件（平台包 + @mini-dev/request + koa-compose）
// 都必须在示例 package.json 的 dependencies 里声明，否则微信「构建 npm」不会构建进 miniprogram_npm。
const SAMPLES = [
    { name: 'wechat', dir: 'sample-request-wechat', platformPkg: '@mini-dev/request-wx', platform: 'wx' },
    { name: 'alipay', dir: 'sample-request-alipay', platformPkg: '@mini-dev/request-my', platform: 'my' },
    { name: 'douyin', dir: 'sample-request-douyin', platformPkg: '@mini-dev/request-tt', platform: 'tt' }
];

// 各平台原生形状 + engine 映射后的 Response 期望。
// - wx：success `{ data, header, statusCode, cookies }`，支持 chunked；
// - my：success `{ data, status, headers }`（status 非 statusCode、headers 非 header、无 cookies），不支持 chunked；
// - tt：success `{ data, statusCode }`（官方文档未列 header/cookies，engine 读取但通常 undefined），不支持 chunked。
const NATIVE = {
    wx: {
        global: 'wx',
        success: { data: 'OK', header: { H: '1' }, statusCode: 200, cookies: ['ck'] },
        fail: { errMsg: 'request:fail mock timeout' },
        failIs: (e) => e.errMsg === 'request:fail mock timeout',
        resData: 'OK',
        resHeadersH: '1',
        resStatusCode: 200,
        resCookies: ['ck'],
        supportsChunked: true
    },
    my: {
        global: 'my',
        success: { data: 'OK', status: 200, headers: { H: '1' } },
        fail: { error: 12, errorMessage: 'request:fail timeout' },
        failIs: (e) => e.error === 12,
        resData: 'OK',
        resHeadersH: '1',
        resStatusCode: 200,
        resCookies: undefined,
        supportsChunked: false
    },
    tt: {
        global: 'tt',
        success: { data: 'OK', statusCode: 200 },
        fail: { errMsg: 'request:fail mock timeout' },
        failIs: (e) => e.errMsg === 'request:fail mock timeout',
        resData: 'OK',
        resHeadersH: undefined,
        resStatusCode: 200,
        resCookies: undefined,
        supportsChunked: false
    }
};

function checkSampleDeps(sample) {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO, sample.dir, 'package.json'), 'utf8'));
    const deps = pkg.dependencies || {};
    const required = [sample.platformPkg, '@mini-dev/request', 'koa-compose'];
    for (const d of required) {
        if (!deps[d]) bad(`[${sample.name}] package.json 缺少直接依赖 ${d}——微信「构建 npm」不递归 pnpm 嵌套 node_modules，运行期三件都必须在示例顶层声明`);
        else ok(`[${sample.name}] 直接依赖 ${d}`);
    }
}

// 装一个可控的平台全局 request：返回带 abort（+ wx 的 onHeadersReceived/onChunkReceived）的假 RequestTask，
// 由 behavior 决定异步（setTimeout 0）触发的结果：success / fail / chunked / abort（不触发，等外部 abort）。
// 返回该 task 引用供断言 abort 次数。
function installMock(platform, behavior) {
    const cfg = NATIVE[platform];
    const task = {
        abortCalls: 0,
        _h: [],
        _c: [],
        abort() { this.abortCalls++; },
        onHeadersReceived(cb) { this._h.push(cb); },
        onChunkReceived(cb) { this._c.push(cb); }
    };
    globalThis[cfg.global] = {
        request(option) {
            setTimeout(() => {
                if (behavior === 'abort') return; // 外部 abort，不触发结果
                if (behavior === 'fail') {
                    option.fail(cfg.fail);
                    return;
                }
                if (behavior === 'chunked') {
                    task._h.forEach((f) => f({ header: { H: '1' }, statusCode: 200, cookies: ['ck'] }));
                    for (const ch of ['AAA', 'BBB']) task._c.forEach((f) => f({ data: ch }));
                    option.success({ data: '', header: { H: '1' }, statusCode: 200, cookies: ['ck'] });
                } else {
                    option.success(cfg.success);
                }
            }, 0);
            return task;
        }
    };
    return task;
}

async function rejects(p, predicate, msg) {
    try {
        await p;
        bad(msg + ' (未 reject)');
    } catch (e) {
        predicate(e) ? ok(msg + ' -> ' + (e.code || e.errMsg || e.error || e.message)) : bad(msg + ' -> 期望不符: ' + JSON.stringify({ code: e.code, errMsg: e.errMsg, error: e.error, message: e.message }));
    }
}

async function drive(sample) {
    const cfg = NATIVE[sample.platform];
    const sampleDir = path.join(REPO, sample.dir);
    console.log('== ' + sample.name + ' ==');
    checkSampleDeps(sample);

    const req = createRequire(path.join(sampleDir, 'package.json'));
    let lib;
    try {
        lib = req(sample.platformPkg);
        ok('require(' + sample.platformPkg + ') 解析到示例 node_modules 的构建产物');
    } catch (e) {
        bad('require(' + sample.platformPkg + ') 失败: ' + e.message);
        return;
    }
    const { createRequest, AbortController, AbortControllerPolyfill } = lib;

    // 1. success 透传（各平台原生 res 形状不同，engine 映射成统一 Response）
    {
        installMock(sample.platform, 'success');
        const r = createRequest();
        const res = await r({ url: 'http://x/get' });
        expect(res.data === cfg.resData, 'success res.data 原样透传 = ' + res.data);
        if (cfg.resHeadersH === undefined) {
            expect(res.headers === undefined, 'success res.headers 平台未暴露 = undefined');
        } else {
            expect(res.headers && res.headers.H === cfg.resHeadersH, 'success res.headers 透传 = ' + JSON.stringify(res.headers));
        }
        expect(res.statusCode === cfg.resStatusCode, 'success res.statusCode = ' + res.statusCode);
        if (cfg.resCookies === undefined) {
            expect(res.cookies === undefined, 'success res.cookies 平台未暴露 = undefined');
        } else {
            expect(Array.isArray(res.cookies) && res.cookies[0] === cfg.resCookies[0], 'success res.cookies 透传');
        }
    }

    // 2. fail 原样透传（原生错误形状，非 RequestError）
    {
        installMock(sample.platform, 'fail');
        const r = createRequest();
        await rejects(r({ url: 'http://x/get' }), cfg.failIs, 'fail 原样透传');
    }

    // 3. abort：signal 标准接口 → 抛 CANCELLED，且 engine 调了 task.abort()
    {
        const task = installMock(sample.platform, 'abort');
        const r = createRequest();
        const ctrl = new AbortController();
        const p = r({ url: 'http://x/get', ext: { signal: ctrl.signal } });
        ctrl.abort();
        await rejects(p, (e) => e.code === 'CANCELLED', 'abort 抛 RequestError(CANCELLED)');
        expect(task.abortCalls === 1, 'engine 经 signal 监听调 task.abort()（signal 不持有 task）');
    }

    // 4. 已 abort 的 signal 在请求前短路（不发真实请求）
    {
        const task = installMock(sample.platform, 'abort');
        const r = createRequest();
        const ctrl = new AbortController();
        ctrl.abort();
        await rejects(r({ url: 'http://x/get', ext: { signal: ctrl.signal } }), (e) => e.code === 'CANCELLED', '请求前已 abort 短路');
        expect(task.abortCalls === 0, '短路不创建/不调 task');
    }

    // 5. chunked（仅 wx）：headers 到达即 resolve，chunks 经 data 事件透传，success 收尾 end
    if (cfg.supportsChunked) {
        installMock(sample.platform, 'chunked');
        const r = createRequest();
        const res = await r({ url: 'http://x/stream', enableChunked: true });
        expect(res.enableChunked === true, 'chunked res.enableChunked = true');
        expect(res.headers && res.headers.H === '1', 'chunked res.headers 透传');
        const chunks = [];
        await new Promise((resolve) => {
            res.data.on('data', (c) => chunks.push(c));
            res.data.on('end', resolve);
            res.data.on('error', (e) => bad('chunked error: ' + e));
        });
        expect(JSON.stringify(chunks) === JSON.stringify(['AAA', 'BBB']), 'chunked chunks 经 data 事件透传 = ' + JSON.stringify(chunks));
    } else {
        ok(`${sample.name} 不支持 chunked（平台原生无 onChunkReceived），跳过 chunked 用例`);
    }

    // 6. 两段式拦截器顺序（request 先添加的后执行；response 先添加的先执行）
    {
        installMock(sample.platform, 'success');
        const r = createRequest();
        const order = [];
        r.addRequestInterceptor((req) => { order.push('req.1'); return req; })
            .addRequestInterceptor((req) => { order.push('req.2'); return req; });
        r.addResponseInterceptor((res) => { order.push('res.1'); return res; })
            .addResponseInterceptor((res) => { order.push('res.2'); return res; });
        await r({ url: 'http://x/get' });
        expect(JSON.stringify(order) === JSON.stringify(['req.2', 'req.1', 'res.1', 'res.2']), '拦截器执行顺序 = ' + JSON.stringify(order));
    }

    // 7. AbortController 解析：globalThis.AbortController 缺席时回落到库自带 polyfill
    {
        const saved = globalThis.AbortController;
        globalThis.AbortController = undefined;
        try {
            const ctrl = new AbortController();
            expect(ctrl.signal && typeof ctrl.signal.addEventListener === 'function', 'globalThis.AbortController 缺席 → 用库自带 polyfill（signal 有 addEventListener）');
            ctrl.abort();
            expect(ctrl.signal.aborted === true, 'polyfill abort 生效');
        } finally {
            globalThis.AbortController = saved;
        }
    }

    // 8. AbortController 解析：用户全局挂载的 polyfill 优先于库自带
    {
        const saved = globalThis.AbortController;
        let constructed = 0;
        function UserAC() { constructed++; this.signal = { aborted: false, onabort: null }; }
        UserAC.prototype.abort = function () { this.signal.aborted = true; };
        globalThis.AbortController = UserAC;
        try {
            const ctrl = new AbortController();
            expect(constructed === 1, '用户全局挂载的 AbortController 被优先使用');
            ctrl.abort();
            expect(ctrl.signal.aborted === true, '用户实现的 abort 生效');
        } finally {
            globalThis.AbortController = saved;
        }
    }

    // 9. AbortControllerPolyfill 可直接独立使用（导出兜底实现）
    {
        const ctrl = new AbortControllerPolyfill();
        ctrl.abort();
        expect(ctrl.signal.aborted === true, 'AbortControllerPolyfill 独立构造 + abort 生效');
    }
}

(async () => {
    for (const sample of SAMPLES) {
        try {
            await drive(sample);
        } catch (e) {
            bad('[' + sample.name + '] 驱动异常: ' + (e && e.stack || e));
        }
    }
    console.log('\n==== SAMPLES: ' + pass + ' passed, ' + fail + ' failed ====');
    process.exit(fail ? 1 : 0);
})();
