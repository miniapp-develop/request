/**
 * 通用事件总线 + buffer：chunked 传输时缓存「已到达但尚未被监听」的数据。
 * 平台无关——平台 engine 把原生 chunk 事件 emit 进来，消费方 `on('data'/'end'/'error')` 监听。
 */
export class ChunkThrough {
    private events: Record<string, Array<(data: unknown) => void>> = {};
    private finished = false;
    private readonly enableBuffer: boolean;
    private buffers: Record<string, unknown[]> = {};

    constructor({ enableBuffer }: { enableBuffer?: boolean } = { enableBuffer: true }) {
        this.enableBuffer = enableBuffer !== false;
    }

    on(event: string, handler: (data: unknown) => void): void {
        if (!this.events[event]) {
            this.events[event] = [];
            if (this.enableBuffer && this.buffers[event]) {
                for (const data of this.buffers[event]) {
                    handler(data);
                }
                delete this.buffers[event];
            }
        }
        this.events[event].push(handler);
    }

    emit(event: string, data: unknown): void {
        if (this.finished) {
            return;
        }
        const handlers = this.events[event];
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        } else if (this.enableBuffer) {
            if (!this.buffers[event]) {
                this.buffers[event] = [];
            }
            this.buffers[event].push(data);
        }
    }

    end(): void {
        this.emit('end', undefined);
        this.finished = true;
    }

    error(err: unknown): void {
        this.emit('error', err);
        this.finished = true;
    }
}
