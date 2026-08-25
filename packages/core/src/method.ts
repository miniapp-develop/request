import { RequestError } from './errors';
import compose from 'koa-compose';
import { RequestCache, createCacheInterceptor } from './middleware/cache';
import { createTimeoutInterceptor } from './middleware/timeout';
import { createAbortInterceptor } from './middleware/abort';
import { defaultDelay, runWithRetry } from './middleware/retry';
import type {
    CanonicalRequest,
    ExtControls,
    Interceptor,
    RequestContext,
    RequestEngine,
    RequestOptions
} from './types';

/** 库保留键：剥掉这 4 个，其余原样作为 canonical 请求透传给 engine。 */
const LIB_KEYS = new Set(['ext', 'success', 'fail', 'complete']);

export interface CreateMethodOptions {
    /**
     * Engine 工厂，首次调用时懒调以绑定平台原生全局。
     * 由平台库提供（如 @mini-dev/request-wx 的 createWxEngine）；核心不碰 globalThis、
     * 不构造 engine。工厂抛出的错误（如 UNSUPPORTED）会原样透给调用方的 reject / fail。
     */
    engine: () => RequestEngine;
    /** 该方法实例的默认拦截器（链中位于内置拦截器之后、单次拦截器之前）。 */
    interceptors?: Interceptor[];
    /** 该方法独享的缓存容量，默认 16（FIFO 驱逐最旧）。 */
    cacheSize?: number;
    /** 可注入的重试退避函数，便于测试。默认基于 setTimeout。 */
    retryDelay?: (ms: number) => Promise<void>;
}

/** 增强后的方法：canonical 请求 + ext 保留字段 + 原生回调。 */
export type AugmentedMethod = (opts?: RequestOptions) => Promise<unknown> | undefined;

/**
 * 把一个原生网络请求方法包成一个增强方法实例：
 * 自带拦截器链（abort/cache/timeout/用户/单次/core）+ 独享缓存 + retry 外层。
 * canonical 请求与响应原样透传；库控制走 ext；回调模式与原生一致（返回 undefined）。
 *
 * 平台绑定由 `opts.engine` 工厂承担：首次调用时调用它拿到 engine 并缓存，
 * 失败（工厂抛错）则下次调用重试。核心本身平台无关。
 */
export function createMethod(name: string, opts: CreateMethodOptions): AugmentedMethod {
    const { engine: engineFactory, interceptors = [], cacheSize = 16, retryDelay = defaultDelay } = opts;
    let engine: RequestEngine | null = null;
    const cache = new RequestCache(cacheSize);

    // 内置拦截器无 per-call 状态（都从 ctx 读），实例与稳定前缀链只建一次，避免每次调用重新分配闭包。
    const baseInterceptors: Interceptor[] = [
        createAbortInterceptor(),
        createCacheInterceptor({ cache }),
        createTimeoutInterceptor(),
        ...interceptors
    ];

    function ensureEngine(): RequestEngine {
        if (engine) return engine;
        // 工厂抛错时 engine 保持 null，下次调用会重试工厂（与旧版懒绑语义一致）。
        engine = engineFactory();
        return engine;
    }

    return function method(callOpts: RequestOptions = {}): Promise<unknown> | undefined {
        const ext: ExtControls = callOpts.ext ?? {};
        const canonical: CanonicalRequest = {};
        for (const k in callOpts) {
            if (!LIB_KEYS.has(k)) canonical[k] = callOpts[k];
        }
        const success = callOpts.success as ((r: unknown) => void) | undefined;
        const fail = callOpts.fail as ((e: unknown) => void) | undefined;
        const complete = callOpts.complete as ((r: unknown) => void) | undefined;
        const hasCallback = !!success || !!fail || !!complete;

        const run = async (): Promise<unknown> => {
            const e = ensureEngine();
            const ctx: RequestContext = {
                method: name,
                options: callOpts,
                canonical,
                ext,
                engine: e,
                result: undefined,
                state: {}
            };
            const chain = [...baseInterceptors, ...(ext.interceptors ?? []), core];
            await runWithRetry(ctx, () => compose(chain)(ctx), { retry: ext.retry, delay: retryDelay });
            return ctx.result;
        };

        if (hasCallback) {
            // 回调模式：返回 undefined（与原生一致），异步触发 success/fail/complete
            run().then(
                (res) => {
                    if (success) success(res);
                    if (complete) complete(res);
                },
                (err) => {
                    if (fail) fail(err);
                    if (complete) complete(err);
                }
            );
            return undefined;
        }
        return run();
    };
}

/** 链尾：纯透传调 engine，不 normalize。engine 负责 canonical→native 请求与 Response 构造。 */
const core: Interceptor = async function core(ctx) {
    if (typeof ctx.engine.request !== 'function') {
        throw new RequestError('UNSUPPORTED', `${ctx.method}:fail engine.request not supported`);
    }
    ctx.result = await ctx.engine.request(ctx.canonical, ctx.ext.signal);
};
