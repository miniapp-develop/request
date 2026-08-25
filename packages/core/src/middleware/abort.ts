import { RequestError } from '../errors';
import type { Interceptor, RequestContext } from '../types';

/**
 * 取消中间件：ext.signal 已 abort 或在请求中 abort 时抛 CANCELLED。
 * signal 由调用方传入（库导出的 AbortController 解析到：globalThis.AbortController 系统原生/用户
 * polyfill，否则库自带兜底；也可直接用 AbortControllerPolyfill）——signal 来源对本中间件无关，
 * 只用 aborted/addEventListener/removeEventListener。本中间件只负责 promise 侧抛 CANCELLED，
 * 真正中断原生请求由平台 engine 订阅同一个 signal 的 abort 事件后调 task.abort() 完成。
 *
 * 竞态说明：abort 时本中间件 onAbort 同步 reject(CANCELLED)，而 engine 的原生 fail（task.abort 触发）
 * 是异步到达的，故 CANCELLED 先结算胜出；engine 那条迟到 rejected 被 next().then 的 err handler 兜住。
 */
export function createAbortInterceptor(): Interceptor {
    return async function abort(ctx: RequestContext, next) {
        const signal = ctx.ext.signal;
        if (!signal) {
            return next();
        }
        if (signal.aborted) {
            throw new RequestError('CANCELLED', 'request:fail aborted');
        }
        return new Promise<void>((resolve, reject) => {
            const onAbort = () => {
                reject(new RequestError('CANCELLED', 'request:fail aborted'));
            };
            signal.addEventListener('abort', onAbort);
            next().then(
                () => {
                    signal.removeEventListener('abort', onAbort);
                    resolve();
                },
                (err) => {
                    signal.removeEventListener('abort', onAbort);
                    reject(err);
                }
            );
        });
    };
}
