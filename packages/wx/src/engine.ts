import { RequestError, Response } from '@mini-dev/request';
import type { AbortSignalLike, CanonicalRequest, RequestEngine } from '@mini-dev/request';
import { isTransientError } from './strategies';

// wx = 微信小程序全局；本包仅在微信环境使用，不防御其缺席。
declare const wx: any;

/**
 * 构造 wx 引擎：把 `wx.request` + `RequestTask` 包成核心的 `RequestEngine`。
 *
 * 职责（平台特有，故在平台包里）：
 * - **canonical→native 出向映射**：核心 canonical 用 `headers`（复数），wx 原生用 `header`（单数），
 *   本引擎调 `wx.request` 前把 `headers`→`header`，其余字段（`url`/`method`/`data`/`enableChunked` 及 passthrough）原样透传；
 *   `enableChunkedBuffer` 是本库自定义参数（非 wx 原生），engine 自留构造 `ChunkThrough`，不透传给 `wx.request`；
 * - **native→canonical 入向映射**：wx 的 `success`/`fail`/`onHeadersReceived`/`onChunkReceived`
 *   平台特有事件映射成核心 `Response` 的规范方法（`setHeaders`(`res.header`→headers)/`emitChunk`/`resolve`/`reject`）；
 * - chunked：首帧 headers 即 resolve 出 Response（其 `data` 为 `ChunkThrough` 流），传输完毕 success 标记流 end；
 * - 取消：engine 持有 `RequestTask`，订阅 `signal` 的 abort 事件后调 `task.abort()` 真正中断在途请求——
 *   signal 保持通用、不认识 task（与旧版 `signal._attachTask_(task)` 的职责泄漏相反）。
 */
export function createWxEngine(vendor: any = wx): RequestEngine {
    const vendorRequest = vendor.request.bind(vendor);

    return {
        request(args: CanonicalRequest, signal?: AbortSignalLike): Promise<Response> {
            const enableChunked = !!args.enableChunked;
            const enableChunkedBuffer = Object.prototype.hasOwnProperty.call(args, 'enableChunkedBuffer')
                ? !!args.enableChunkedBuffer
                : true;
            const response = new Response(enableChunked, enableChunkedBuffer);
            // canonical→native：headers（复数）→ wx 的 header（单数）。其余字段原样透传。
            // enableChunkedBuffer 是本库自定义参数（非 wx 原生），destructure 出 native 不透传给 wx.request。
            const { headers, enableChunkedBuffer: _discardedBuffer, ...native } = args;

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
                        response.setHeaders(res.header, res.statusCode, res.cookies);
                        if (enableChunked) {
                            response.resolve(undefined); // 传输完毕，标记流结束
                            clean();
                        } else {
                            response.resolve(res.data);
                            if (!settled) {
                                settled = true;
                                clean();
                                resolve(response);
                            }
                        }
                    },
                    fail(err: any) {
                        if (enableChunked) response.reject(err); // 把错误推入流
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
                            /* 某些平台 task 已销毁，忽略 */
                        }
                    };
                    signal.addEventListener('abort', onAbort);
                }

                if (enableChunked) {
                    // 首帧 headers 即 resolve 出 Response；流继续到 success/fail，监听器保留至 success/fail 才 clean。
                    task.onHeadersReceived((d: any) => {
                        response.setHeaders(d.header, d.statusCode, d.cookies);
                        if (!settled) {
                            settled = true;
                            resolve(response);
                        }
                    });
                    task.onChunkReceived((c: any) => response.emitChunk(c.data));
                }
            });
        },
        isTransientError
    };
}
