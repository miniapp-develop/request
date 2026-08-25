import { RequestError, Response } from '@mini-dev/request';
import type { AbortSignalLike, CanonicalRequest, RequestEngine } from '@mini-dev/request';
import { isTransientError } from './strategies';

// my = 支付宝小程序全局；本包仅在支付宝环境使用，不防御其缺席。
declare const my: any;

/**
 * 构造 my 引擎：把支付宝 `my.request` 包成核心的 `RequestEngine`。
 *
 * 支付宝与微信的字段差异（已通过支付宝官方文档核实）：
 * - **入参 headers 字段名**：支付宝用 `headers`（复数），与核心 canonical 一致 → 出向 identity，无需映射
 *   （微信用 `header` 单数，故 wx engine 需 `headers`→`header`；my 不用）。
 * - **success 回调 res**：`{ data, status, headers }`——`status` 非 `statusCode`、`headers` 即 canonical，
 *   无 `cookies` 字段（支付宝 cookie 走 `enableCookie` + 响应头，不单独暴露）。
 * - **fail 回调 err**：`{ error: number, errorMessage: string }`，`error` 为数字错误码（2/4/12/13/14/19/20）。
 * - **不支持 chunked 流式**：`my.request` 无 `enableChunked` / `onHeadersReceived` / `onChunkReceived`，
 *   `RequestTask` 仅有 `abort()`。本引擎始终以非 chunked `Response` 接收整段响应体——`enableChunked`
 *   在支付宝上被忽略（chunked 流式是 wx 专有能力，文档已说明）；`enableChunked` 原样透传给原生（被忽略）。
 * - **返回 RequestTask**：仅 `abort()`。
 *
 * 取消：engine 持有 `RequestTask`，订阅 `signal` 的 abort 事件后调 `task.abort()` 真正中断在途请求——
 * signal 保持通用、不认识 task（与旧版 `signal._attachTask_(task)` 的职责泄漏相反）。
 */
export function createMyEngine(vendor: any = my): RequestEngine {
    const vendorRequest = vendor.request.bind(vendor);

    return {
        request(args: CanonicalRequest, signal?: AbortSignalLike): Promise<Response> {
            // canonical 与 my 原生都用 headers（复数）→ 出向 identity，无需映射。
            // 支付宝无 chunked 流式：始终非 chunked Response，整段响应体在 success 一次性到达。
            const response = new Response(false, true);

            return new Promise<Response>((resolve, reject) => {
                // 请求发出前 signal 已 abort：短路，不发起真实网络请求。
                if (signal && signal.aborted) {
                    reject(new RequestError('CANCELLED', 'request:fail abort'));
                    return;
                }

                let settled = false;
                let onAbort: (() => void) | null = null;
                const clean = () => {
                    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
                };

                const task = vendorRequest({
                    ...args,
                    success(res: any) {
                        // 支付宝：res.headers / res.status / 无 cookies
                        response.setHeaders(res.headers, res.status, undefined);
                        response.resolve(res.data);
                        if (!settled) {
                            settled = true;
                            clean();
                            resolve(response);
                        }
                    },
                    fail(err: any) {
                        if (!settled) {
                            settled = true;
                            clean();
                            reject(err);
                        } else {
                            clean();
                        }
                    }
                });

                // engine 持有 task，订阅 signal 实现真正取消；signal 不持有 task。
                if (signal) {
                    onAbort = () => {
                        try {
                            task.abort();
                        } catch {
                            /* task 已销毁，忽略 */
                        }
                    };
                    signal.addEventListener('abort', onAbort);
                }
            });
        },
        isTransientError
    };
}
