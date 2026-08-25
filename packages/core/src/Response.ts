import { ChunkThrough } from './ChunkThrough';

/**
 * 通用响应抽象（平台无关）。
 *
 * 平台 engine 负责把原生 `onHeadersReceived` / `onChunkReceived` / `success` / `fail`
 * 的**平台特有字段**映射成本类的规范入参（`setHeaders` / `emitChunk` / `resolve` / `reject`），
 * 核心不耦合任何平台的字段命名（wx `header`/`statusCode`、my `headers`/`status` 等）。
 *
 * - 非 chunked：`data` 为响应体；`headers`/`statusCode`/`cookies` 由 `setHeaders` 写入。
 * - chunked：`data` 为 `ChunkThrough` 流，消费方 `on('data'|'end'|'error')` 监听。
 */
export class Response {
    private _enableChunked: boolean;
    private _headers?: Record<string, unknown>;
    private _statusCode?: number;
    private _cookies?: unknown;
    private _data: ChunkThrough | unknown;

    constructor(enableChunked = false, enableChunkedBuffer = true) {
        this._enableChunked = enableChunked;
        if (enableChunked) {
            this._data = new ChunkThrough({ enableBuffer: enableChunkedBuffer });
        } else {
            this._data = '';
        }
    }

    /** engine 收到原生 headers 事件后，把平台字段映射成规范字段再调用。 */
    setHeaders(headers: Record<string, unknown>, statusCode: number, cookies?: unknown): void {
        this._headers = headers;
        this._statusCode = statusCode;
        this._cookies = cookies;
    }

    /** engine 收到原生 chunk 事件后调用（chunk 为平台原生 chunk 数据）。 */
    emitChunk(chunk: unknown): void {
        if (this._enableChunked) {
            (this._data as ChunkThrough).emit('data', chunk);
        }
    }

    /** engine 在原生 success 回调后调用：非 chunked 写入响应体，chunked 标记流结束。 */
    resolve(data: unknown): void {
        if (this._enableChunked) {
            (this._data as ChunkThrough).end();
        } else {
            this._data = data;
        }
    }

    /** engine 在原生 fail 回调后调用（仅 chunked 模式把错误推入流）。 */
    reject(err: unknown): void {
        if (this._enableChunked) {
            (this._data as ChunkThrough).error(err);
        }
    }

    get enableChunked(): boolean {
        return this._enableChunked;
    }

    get headers(): Record<string, unknown> | undefined {
        return this._headers;
    }

    get header(): Record<string, unknown> | undefined {
        // 兼容小程序的命名方式
        return this.headers;
    }

    get statusCode(): number | undefined {
        return this._statusCode;
    }

    get cookies(): unknown {
        return this._cookies;
    }

    get data(): unknown {
        return this._data;
    }
}
