import { createCacheInterceptor, RequestCache } from '../src/middleware/cache';
import { Response } from '../src/Response';
import type { RequestContext, RequestEngine } from '../src/types';

function makeCtx(
    ext: any,
    canonical: Record<string, unknown> = {},
    method = 'request'
): RequestContext {
    return {
        method,
        options: { ext, ...canonical } as any,
        canonical,
        ext,
        engine: {} as RequestEngine,
        result: undefined,
        state: {}
    };
}

describe('RequestCache', () => {
    it('set/get 命中', () => {
        const c = new RequestCache(3);
        c.set('request', 'k1', { v: 1 }, 100);
        expect(c.get('request', 'k1', 1000, 200)).toEqual({ v: 1 });
    });

    it('method 不匹配 miss', () => {
        const c = new RequestCache();
        c.set('request', 'k1', { v: 1 }, 100);
        expect(c.get('upload', 'k1', 1000, 200)).toBeUndefined();
    });

    it('key 不匹配 miss', () => {
        const c = new RequestCache();
        c.set('request', 'k1', { v: 1 }, 100);
        expect(c.get('request', 'k2', 1000, 200)).toBeUndefined();
    });

    it('过期 miss', () => {
        const c = new RequestCache();
        c.set('request', 'k1', { v: 1 }, 100);
        expect(c.get('request', 'k1', 100, 201)).toBeUndefined();
    });

    it('maxSize 驱逐最旧', () => {
        const c = new RequestCache(2);
        c.set('request', 'k1', { v: 1 }, 1);
        c.set('request', 'k2', { v: 2 }, 2);
        c.set('request', 'k1', { v: 3 }, 3);
        expect(c.size).toBe(2);
        expect(c.get('request', 'k1', 1000, 3)).toEqual({ v: 3 });
    });

    it('clear / size', () => {
        const c = new RequestCache();
        c.set('request', 'k1', { v: 1 }, 1);
        expect(c.size).toBe(1);
        c.clear();
        expect(c.size).toBe(0);
    });
});

describe('createCacheInterceptor', () => {
    it('命中短路不调 next', async () => {
        const cache = new RequestCache();
        const key = 'request:' + JSON.stringify({ url: 'a' });
        cache.set('request', key, { cached: true }, 50);
        const next = jest.fn(async () => {
            (ctx as any).result = { fresh: true };
        });
        const ctx = makeCtx({ maxAge: 100 }, { url: 'a' });
        await createCacheInterceptor({ cache, now: () => 100 })(ctx, next);
        expect(next).not.toHaveBeenCalled();
        expect(ctx.result).toEqual({ cached: true });
    });

    it('未命中调 next 并写入', async () => {
        const cache = new RequestCache();
        const ctx = makeCtx({ maxAge: 100 }, { url: 'a' });
        const next = jest.fn(async () => {
            ctx.result = { fresh: true };
        });
        await createCacheInterceptor({ cache, now: () => 100 })(ctx, next);
        expect(next).toHaveBeenCalled();
        expect(cache.get('request', 'request:' + JSON.stringify({ url: 'a' }), 1000, 100)).toEqual({ fresh: true });
    });

    it('maxAge<=0 透传不缓存', async () => {
        const cache = new RequestCache();
        const ctx = makeCtx({ maxAge: 0 }, { url: 'a' });
        const next = jest.fn(async () => {
            ctx.result = { fresh: true };
        });
        await createCacheInterceptor({ cache, now: () => 100 })(ctx, next);
        expect(next).toHaveBeenCalled();
        expect(cache.size).toBe(0);
    });

    it('启用缓存但 next 未产出 result 时不写入', async () => {
        const cache = new RequestCache();
        const ctx = makeCtx({ maxAge: 100 }, { url: 'a' });
        const next = jest.fn(async () => {
            /* 不设置 ctx.result */
        });
        await createCacheInterceptor({ cache, now: () => 100 })(ctx, next);
        expect(next).toHaveBeenCalled();
        expect(cache.size).toBe(0);
    });

    it('未注入 now 时回退 Date.now', async () => {
        const cache = new RequestCache();
        const ctx = makeCtx({ maxAge: 100 }, { url: 'a' });
        const next = jest.fn(async () => {
            ctx.result = { fresh: true };
        });
        await createCacheInterceptor({ cache })(ctx, next);
        expect(cache.size).toBe(1);
    });

    it('不同 method 不互命中（method 隔离）', async () => {
        const cache = new RequestCache();
        const ctx1 = makeCtx({ maxAge: 100 }, { url: 'a' }, 'request');
        await createCacheInterceptor({ cache, now: () => 100 })(ctx1, jest.fn(async () => {
            ctx1.result = { r: true };
        }));
        const ctx2 = makeCtx({ maxAge: 100 }, { url: 'a' }, 'upload');
        await createCacheInterceptor({ cache, now: () => 100 })(ctx2, jest.fn(async () => {
            ctx2.result = { u: true };
        }));
        expect(cache.size).toBe(2);
    });

    it('流式响应（chunked）不可重放，不缓存', async () => {
        const cache = new RequestCache();
        const ctx = makeCtx({ maxAge: 100 }, { url: 'a', enableChunked: true });
        const chunkedRes = new Response(true, true);
        const next = jest.fn(async () => {
            ctx.result = chunkedRes;
        });
        await createCacheInterceptor({ cache, now: () => 100 })(ctx, next);
        expect(next).toHaveBeenCalled();
        expect(cache.size).toBe(0);
    });

    it('enableChunked 请求但响应可重放（my/tt 忽略 chunked）仍缓存', async () => {
        const cache = new RequestCache();
        const ctx = makeCtx({ maxAge: 100 }, { url: 'a', enableChunked: true });
        const replayableRes = new Response(false, true);
        replayableRes.resolve({ ok: true });
        const next = jest.fn(async () => {
            ctx.result = replayableRes;
        });
        await createCacheInterceptor({ cache, now: () => 100 })(ctx, next);
        expect(next).toHaveBeenCalled();
        expect(cache.size).toBe(1);
    });
});
