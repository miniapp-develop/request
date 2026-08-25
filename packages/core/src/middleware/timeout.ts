import { RequestError } from '../errors';
import type { Interceptor, RequestContext } from '../types';

/**
 * 超时中间件：ext.timeout > 0 时用 Promise.race 计时。
 *
 * 与 location 不同，HTTP 请求是可取消的——超时后迟到的原生 success 由 engine 的 settled 标记忽略，
 * 真正中断在途请求仍由平台 engine 订阅 signal 实现（调用方可把同一个 signal 同时作 timeout 触发器）。
 * 本期只做 promise 侧超时；「库级 timeout 反向触发 native abort」是后续可选增强（见 README Todo）。
 * 迟到 next 的 resolve/reject 对已结算的 Promise 是 no-op，无需 done 标记。
 */
export function createTimeoutInterceptor(): Interceptor {
    return async function timeout(ctx: RequestContext, next) {
        const t = ctx.ext.timeout;
        if (typeof t !== 'number' || t <= 0) {
            return next();
        }
        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new RequestError('TIMEOUT', `request:fail timeout ${t}`));
            }, t);
            next().then(
                () => {
                    clearTimeout(timer);
                    resolve();
                },
                (err) => {
                    clearTimeout(timer);
                    reject(err);
                }
            );
        });
    };
}
