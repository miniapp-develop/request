import { RequestError, Response } from '@mini-dev/request';
import type { AbortSignalLike, CanonicalRequest, RequestEngine } from '@mini-dev/request';
import { isTransientError } from './strategies';

// tt = 抖音小程序全局；本包仅在抖音环境使用，不防御其缺席。
declare const tt: any;

/**
 * 构造 tt 引擎：把抖音 `tt.request` 包成核心的 `RequestEngine`。
 *
 * 抖音与微信的字段差异（已通过抖音官方文档核实）：
 * - **入参 headers 字段名**：抖音用 `header`（单数），核心 canonical 用 `headers`（复数）
 *   → 出向 `headers`→`header` 映射（同 wx）。
 * - **success 回调 res**：`{ errMsg, statusCode, profile, data }`——官方文档未列 `header`/`cookies` 字段，
 *   本引擎仍读取 `res.header` / `res.cookies`（若平台实际返回则填入，否则 `undefined`）。
 * - **fail 回调 err**：`{ errMsg: 'request:fail ...' }`，与微信同形。
 * - **不支持 chunked 流式**：`tt.request` 无 `enableChunked` / `onHeadersReceived` / `onChunkReceived`，
 *   `RequestTask` 仅有 `abort()`。本引擎始终以非 chunked `Response` 接收整段响应体——`enableChunked`
 *   在抖音上被忽略（chunked 流式是 wx 专有能力，文档已说明）；`enableChunked` 原样透传给原生（被忽略）。
 * - **返回 RequestTask**：仅 `abort()`。
 *
 * 取消：engine 持有 `RequestTask`，订阅 `signal` 的 abort 事件后调 `task.abort()` 真正中断在途请求——
 * signal 保持通用、不认识 task（与旧版 `signal._attachTask_(task)` 的职责泄漏相反）。
 */
export function createTtEngine(vendor: any = tt): RequestEngine {
    const vendorRequest = vendor.request.bind(vendor);

    return {
        request(args: CanonicalRequest, signal?: AbortSignalLike): Promise<Response> {
            // 抖音无 chunked 流式：始终非 chunked Response，整段响应体在 success 一次性到达。
            const response = new Response(false, true);
            // canonical→native：headers（复数）→ 抖音的 header（单数）。其余字段原样透传。
            const { headers, ...native } = args;

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
                    ...native,
                    header: headers,
                    success(res: any) {
                        // 抖音官方文档未列 header/cookies，但读取之以便平台实际返回时填入。
                        response.setHeaders(res.header, res.statusCode, res.cookies);
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
