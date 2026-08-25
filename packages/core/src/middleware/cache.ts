import { stableKey } from '../util';
import { Response } from '../Response';
import type { Interceptor, RequestContext } from '../types';

interface CacheEntry {
    method: string;
    key: string;
    timestamp: number;
    data: unknown;
}

/**
 * 响应缓存：固定容量环形 + TTL。
 * 键为 (method, canonical 的稳定串)，canonical 已编码 url/method/data/headers 等差异，无需 per-platform 策略。
 */
export class RequestCache {
    private entries: CacheEntry[] = [];
    private readonly maxSize: number;

    constructor(maxSize = 16) {
        this.maxSize = maxSize;
    }

    get(method: string, key: string, maxAge: number, now: number): unknown {
        for (let i = this.entries.length - 1; i >= 0; i--) {
            const e = this.entries[i];
            if (e.method !== method || e.key !== key) continue;
            if (now - e.timestamp <= maxAge) return e.data;
            // 命中键但已过期：同键理论上只一条，直接判 miss
            return undefined;
        }
        return undefined;
    }

    set(method: string, key: string, data: unknown, now: number): void {
        this.entries.push({ method, key, timestamp: now, data });
        if (this.entries.length > this.maxSize) {
            this.entries.shift();
        }
    }

    clear(): void {
        this.entries = [];
    }

    get size(): number {
        return this.entries.length;
    }
}

export interface CacheInterceptorOptions {
    cache: RequestCache;
    now?: () => number;
}

/** 缓存中间件：ext.maxAge > 0 时启用，命中短路、不调原生；未命中则下游取数后写入。 */
export function createCacheInterceptor(opts: CacheInterceptorOptions): Interceptor {
    const now = opts.now ?? Date.now;
    return async function cache(ctx: RequestContext, next) {
        const maxAge = ctx.ext.maxAge;
        const enabled = typeof maxAge === 'number' && maxAge > 0;
        if (!enabled) {
            await next();
            return;
        }
        // stableKey 是递归序列化+排序，只在启用缓存时才算，避免每次请求都跑。
        const key = ctx.method + ':' + stableKey(ctx.canonical);
        const hit = opts.cache.get(ctx.method, key, maxAge, now());
        if (hit !== undefined) {
            ctx.result = hit;
            return;
        }
        await next();
        // 流式响应（chunked，`Response.data` 为 `ChunkThrough`）不可重放：缓存它会在二次命中时返回已结束的死流，故不存。
        // 按结果而非请求标志判定——支付宝/抖音忽略 `enableChunked`、响应为可重放整段体，仍可缓存。
        if (ctx.result !== undefined && !(ctx.result instanceof Response && ctx.result.enableChunked)) {
            opts.cache.set(ctx.method, key, ctx.result, now());
        }
    };
}
