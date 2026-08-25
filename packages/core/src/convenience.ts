import { urlStringify } from './qs';
import { createMethod } from './method';
import { RequestError } from './errors';
import { Response } from './Response';
import type {
    ExtControls,
    RequestEngine,
    RequestOptions
} from './types';

/**
 * 便捷归一层（非 augment-only 路径）。
 *
 * 核心的 `createMethod` 纯透传 canonical 请求；本函数把更常规的字段名归一到 canonical：
 * - `headers`/`header` → canonical `headers`（复数，与响应 `Response.headers` 一致、对齐 web 标准）；
 *   两者同存时**由平台原生字段决定谁赢**（`nativeHeaderKey`）——wx/tt 原生是 `header` 故 `header` 赢，
 *   my（支付宝）原生是 `headers`（无 `header`）故 `headers` 赢；只设其一时两种取值一致。归一后 `header`
 *   被删除（canonical 只留 `headers`）。`nativeHeaderKey` 缺省 `'headers'`（canonical 名、平台中立，
 *   核心不隐式默认 wx）；平台包便捷单例各自注入本平台原生名。
 * - `params`：GET 且未设 `data` 时合并进 `data`（小程序会把 GET 的 data 拼到 url）；
 *   非 GET 时拼接到 `url`，`data` 仍单独作为请求体
 * - `method` 不缺省：原样透传给原生，由原生默认（三平台均默认 GET）。
 *   `params` 归一路由仍按"缺省即 GET"判定（与原生 GET 默认一致），仅用于决定 `params` 进 `data` 还是 `url`，不写回 `method`。
 *
 * engine 收到 canonical `headers` 后各自映射到本平台原生 `header`（wx/tt）或 `headers`（my）。
 * 返回新对象，不改调用方入参。由平台包的便捷单例套在 `createMethod` 之外。
 * 纯 augment-only 消费方可直接用 `createMethod`，不经此层。
 */
export function normalizeRequestOptions(
    option: Record<string, unknown>,
    nativeHeaderKey: 'header' | 'headers' = 'headers'
): Record<string, unknown> {
    const o: Record<string, unknown> = { ...option };
    if (o.header || o.headers) {
        // canonical 用 headers（复数）。兼容原生 header（单数）：两者同存时由平台原生字段（nativeHeaderKey）决定优先，
        // 而非写死 header——header 恰是 wx/tt 原生名，写死会把 wx 偏见带进平台无关归一（支付宝原生是 headers，无 header）。
        o.headers = nativeHeaderKey === 'header' ? (o.header ?? o.headers) : (o.headers ?? o.header);
        delete o.header;
    }
    if (o.params) {
        // 缺省 method 按 GET 路由 params（不写回 method；与原生 GET 默认一致）
        const method = String(o.method ?? 'GET').toUpperCase();
        if (method === 'GET') {
            if (!o.data) {
                // 小程序会自己将 data 添加到 url 上
                o.data = o.params;
            }
            // GET 且已设 data：params 被静默忽略（不报错），与旧版一致
        } else {
            // 非 GET：params 拼到 url，data 仍作为请求体单独发送
            o.url = urlStringify(String(o.url), o.params);
        }
        delete o.params; // 已归一进 data/url，从 canonical 移除（不再依赖 FACADE_KEYS 剥离）
    }
    return o;
}

/**
 * 便捷请求实例的形状：旧版 `@mini-dev/request` 的用户态 API（Promise + 两段式拦截器）。
 * 叠在 augment-only 核心 `createMethod` 之外的归一层：headers/params 归一、库控制收敛进 ext、始终返回 Promise（回调丢弃）。
 * 平台无关——平台差异只在 `createConvenienceRequest` 的两个注入点：`getGlobal` 与 `createEngine`。
 * 造独立实例 / 注入自定义 engine 用平台包导出的 `createRequest(engine?)`，不在实例上。
 */
export interface RequestInstance {
    (option?: Record<string, unknown>): Promise<Response>;
    engine: RequestEngine | null;
    addRequestInterceptor: (fn: (req: Record<string, unknown>) => unknown) => RequestInstance;
    addResponseInterceptor: (fn: (res: Response, req: Record<string, unknown>) => unknown) => RequestInstance;
}

/**
 * 便捷层从 canonical 顶层剥离的保留键：回调（success/fail/complete，便捷层 Promise-only，丢弃）。
 * `header`/`params` 由 normalizeRequestOptions 归一后自行删除，不在此处。库控制（timeout/retry/maxAge/signal/interceptors）
 * **不**在此集合——它们与原生参数同处顶层、原样透传给原生，库不假设原生 `request` 有哪些参数；库级控制由消费方放进 `ext`（见 mapToCore）。
 * `ext` 也不在此集合，由 mapToCore 单独透传。
 */
const FACADE_KEYS = new Set(['success', 'fail', 'complete']);

/**
 * 把顶层 option 归一成核心 `createMethod` 的入参：
 * normalizeRequestOptions 处理 headers/header→canonical headers（双写时原生字段 nativeHeaderKey 优先）、params→data|url（归一后删除 header/params，method 不缺省）；
 * 再把回调（success/fail/complete）从 canonical 顶层剥离丢弃（便捷层 Promise-only），
 * `ext` 原样透传（消费方在此放库控制），其余（url/data/headers/timeout/retry/maxAge/signal/interceptors/enableChunked…）
 * 原样作为 canonical 透传给 engine——库不假设原生 `request` 有哪些参数，库级控制只认 `ext`。
 */
function mapToCore(option: Record<string, unknown>, nativeHeaderKey: 'header' | 'headers'): RequestOptions {
    const o = normalizeRequestOptions(option, nativeHeaderKey);
    const canonical: Record<string, unknown> = {};
    for (const k in o) {
        if (!FACADE_KEYS.has(k) && k !== 'ext') canonical[k] = o[k];
    }
    const ext: ExtControls = (o.ext as ExtControls | undefined) ?? {};
    return { ...canonical, ext };
}

/**
 * 平台注入点：`getGlobal` 返回本平台原生全局（无则 null，核心不碰 globalThis），
 * `createEngine` 把该全局包成核心 `RequestEngine`，`nativeHeaderKey` 是本平台原生 header 字段名
 * （wx/tt `'header'`、my `'headers'`），用于 headers/header 双写时的优先判定。三者由各平台包提供。
 */
export interface ConvenienceBindings {
    getGlobal: () => unknown;
    createEngine: (vendor: unknown) => RequestEngine;
    /** 本平台原生 header 字段名；缺省 `'headers'`（canonical 名、平台中立）。 */
    nativeHeaderKey?: 'header' | 'headers';
}

/**
 * 创建一个便捷请求实例。`engine` 缺省时懒绑平台全局（无则 null，handle 抛 No engine found）。
 * 两段式拦截器按「后注册者在外层」对称嵌套：request 拦截器 unshift（后注册的先跑）、response 拦截器 push（先注册的先跑）；
 * 成对注册 A、B 时执行序为 reqB→reqA→[核心链]→resA→resB，即后注册的 B 整体包在 A 外层（洋葱式后进先出）。
 * 始终返回 Promise（回调 success/fail/complete 在归一层丢弃，不进核心）。造独立实例 / 注入自定义 engine 用平台包的 `createRequest(engine?)`。
 * 平台无关；平台包只提供 `getGlobal` + `createEngine`。
 */
export function createConvenienceRequest(
    bindings: ConvenienceBindings,
    engine?: RequestEngine | null
): RequestInstance {
    const eng = engine ?? (bindings.getGlobal() ? bindings.createEngine(bindings.getGlobal()) : null);
    const method = eng ? createMethod('request', { engine: () => eng }) : null;
    const nativeHeaderKey = bindings.nativeHeaderKey ?? 'headers';
    const requestInterceptors: Array<(req: Record<string, unknown>) => unknown> = [];
    const responseInterceptors: Array<(res: Response, req: Record<string, unknown>) => unknown> = [];

    const request = function request(option: Record<string, unknown> = {}): Promise<Response> {
        return handle(option);
    } as RequestInstance;

    request.engine = eng;

    request.addRequestInterceptor = function (fn) {
        requestInterceptors.unshift(fn);
        return this;
    };
    request.addResponseInterceptor = function (fn) {
        responseInterceptors.push(fn);
        return this;
    };

    async function handle(option: Record<string, unknown>): Promise<Response> {
        if (!method) {
            throw new RequestError('UNSUPPORTED', 'No engine found');
        }
        // unshift：后注册的排在前 = 先跑（成对拦截器里后注册者作为外层，先进入）
        let req = option;
        for (const fn of requestInterceptors) {
            req = (await fn(req)) as Record<string, unknown>;
        }
        const coreOpts = mapToCore(req, nativeHeaderKey);
        let res = (await method(coreOpts)) as Response;
        // push：先注册的排在前 = 先跑（与上面 unshift 对称：后注册的外层后退出）；第二参数为 req（request 拦截器处理后的）
        for (const fn of responseInterceptors) {
            res = (await fn(res, req)) as Response;
        }
        return res;
    }

    return request;
}
