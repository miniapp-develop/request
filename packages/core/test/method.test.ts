import { RequestError } from '../src/errors';
import { createMethod } from '../src/method';
import { Response } from '../src/Response';
import { AbortController } from '../src/AbortController';
import type { Interceptor, RequestEngine } from '../src/types';

interface Behaviour {
    data?: unknown;
    fail?: unknown;
    delay?: number;
    isTransientError?: (e: unknown) => boolean;
    pendingSignal?: boolean;
}

function makeEngine(b: Behaviour = {}): RequestEngine {
    return {
        request: jest.fn(async (args: Record<string, unknown>, signal?: AbortSignal) => {
            if (b.delay) await new Promise((r) => setTimeout(r, b.delay));
            if (b.pendingSignal) {
                return new Promise<Response>((resolve) => {
                    signal?.addEventListener('abort', () => {
                        const res = new Response(false, true);
                        res.setHeaders({}, 200);
                        res.resolve(undefined);
                        resolve(res);
                    });
                });
            }
            if (b.fail) throw b.fail;
            const res = new Response(false, true);
            res.setHeaders({}, 200);
            res.resolve(b.data ?? { ok: true });
            return res;
        }),
        isTransientError: b.isTransientError
    };
}

const engine = (b: Behaviour = {}) => () => makeEngine(b);

describe('createMethod — 透传', () => {
    it('返回 engine 的 Response 原样', async () => {
        const request = createMethod('request', { engine: engine() });
        const r = await request({ url: 'http://x', method: 'GET' });
        expect(r).toBeInstanceOf(Response);
        expect((r as Response).data).toEqual({ ok: true });
    });

    it('canonical 参数平铺透传，ext / success / fail / complete 被剥', async () => {
        const e = makeEngine();
        const request = createMethod('request', { engine: () => e });
        await request({ url: 'http://x', method: 'GET', headers: { a: 1 }, ext: { timeout: 1000 } });
        expect(e.request).toHaveBeenCalledWith(
            expect.objectContaining({ url: 'http://x', method: 'GET', headers: { a: 1 } }),
            undefined
        );
        const arg = (e.request as jest.Mock).mock.calls[0][0];
        expect(arg.ext).toBeUndefined();
        expect(arg.success).toBeUndefined();
        expect(arg.fail).toBeUndefined();
        expect(arg.complete).toBeUndefined();
        // canonical 用 headers（复数）；header 别名不经 augment-only 归一，不应出现
        expect(arg.header).toBeUndefined();
    });

    it('ext.signal 透传给 engine', async () => {
        const e = makeEngine();
        const request = createMethod('request', { engine: () => e });
        const ac = new AbortController();
        await request({ url: 'http://x', ext: { signal: ac.signal } });
        expect((e.request as jest.Mock).mock.calls[0][1]).toBe(ac.signal);
    });

    it('缺省 opts 透传空 canonical', async () => {
        const e = makeEngine();
        const request = createMethod('request', { engine: () => e });
        await request();
        expect(e.request).toHaveBeenCalledWith({}, undefined);
    });

    it('engine 工厂懒调且缓存（多次调用只调一次）', async () => {
        let calls = 0;
        const request = createMethod('request', {
            engine: () => {
                calls++;
                return makeEngine();
            }
        });
        await request({});
        await request({});
        expect(calls).toBe(1);
    });
});

describe('createMethod — 错误透传与库源错误', () => {
    it('原生失败原样 reject（不包成 RequestError）', async () => {
        const request = createMethod('request', { engine: engine({ fail: { errMsg: 'request:fail' } }) });
        await expect(request({})).rejects.toEqual({ errMsg: 'request:fail' });
    });

    it('超时抛 RequestError(TIMEOUT) 且不被 retry 重试', async () => {
        const e = makeEngine({ delay: 50 });
        const request = createMethod('request', { engine: () => e });
        await expect(request({ ext: { timeout: 20, retry: 3 } })).rejects.toMatchObject({ code: 'TIMEOUT' });
        expect(e.request).toHaveBeenCalledTimes(1); // 库源错误终态，不重试
        await new Promise((r) => setTimeout(r, 60));
    });

    it('已 abort 抛 RequestError(CANCELLED) 且不调 engine', async () => {
        const e = makeEngine();
        const request = createMethod('request', { engine: () => e });
        const ac = new AbortController();
        ac.abort();
        await expect(request({ ext: { signal: ac.signal } })).rejects.toMatchObject({ code: 'CANCELLED' });
        expect(e.request).not.toHaveBeenCalled();
    });

    it('请求中 abort 抛 RequestError(CANCELLED)', async () => {
        const e = makeEngine({ pendingSignal: true });
        const request = createMethod('request', { engine: () => e });
        const ac = new AbortController();
        const p = request({ ext: { signal: ac.signal } });
        setTimeout(() => ac.abort(), 10);
        await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    });

    it('engine.request 不是函数抛 RequestError(UNSUPPORTED)', async () => {
        const request = createMethod('request', { engine: () => ({}) as any });
        await expect(request({})).rejects.toMatchObject({ code: 'UNSUPPORTED' });
    });

    it('engine 工厂抛错时调用 reject 该错误，且下次调用重试工厂（懒调、未缓存）', async () => {
        let calls = 0;
        const request = createMethod('request', {
            engine: () => {
                calls++;
                throw new RequestError('UNSUPPORTED', 'wx: request not found');
            }
        });
        await expect(request({})).rejects.toMatchObject({ code: 'UNSUPPORTED' });
        await expect(request({})).rejects.toMatchObject({ code: 'UNSUPPORTED' });
        expect(calls).toBe(2);
    });
});

describe('createMethod — 缓存', () => {
    it('ext.maxAge 命中第二次不调 engine', async () => {
        const e = makeEngine();
        const request = createMethod('request', { engine: () => e });
        await request({ url: 'a', ext: { maxAge: 1000 } });
        await request({ url: 'a', ext: { maxAge: 1000 } });
        expect(e.request).toHaveBeenCalledTimes(1);
    });

    it('不同 canonical 不互相命中', async () => {
        const e = makeEngine();
        const request = createMethod('request', { engine: () => e });
        await request({ url: 'a', ext: { maxAge: 1000 } });
        await request({ url: 'b', ext: { maxAge: 1000 } });
        expect(e.request).toHaveBeenCalledTimes(2);
    });

    it('无 maxAge 不缓存，每次调 engine', async () => {
        const e = makeEngine();
        const request = createMethod('request', { engine: () => e });
        await request({ url: 'a' });
        await request({ url: 'a' });
        expect(e.request).toHaveBeenCalledTimes(2);
    });
});

describe('createMethod — 重试', () => {
    it('瞬时原生错误按 ext.retry 重试', async () => {
        let attempt = 0;
        const e = {
            request: jest.fn(async () => {
                if (++attempt < 2) throw { errMsg: 'request:fail network' };
                const res = new Response(false, true);
                res.setHeaders({}, 200);
                res.resolve({ ok: true });
                return res;
            }),
            isTransientError: () => true
        };
        const request = createMethod('request', { engine: () => e as any, retryDelay: () => Promise.resolve() });
        const r = await request({ ext: { retry: 2 } });
        expect((r as Response).data).toEqual({ ok: true });
        expect(e.request).toHaveBeenCalledTimes(2);
    });

    it('isTransientError 判终态的原生错误不重试', async () => {
        const e = {
            request: jest.fn(async () => {
                throw { errMsg: 'request:fail timeout' };
            }),
            isTransientError: () => false
        };
        const request = createMethod('request', {
            engine: () => e as any,
            retryDelay: () => Promise.resolve()
        });
        await expect(request({ ext: { retry: 3 } })).rejects.toEqual({ errMsg: 'request:fail timeout' });
        expect(e.request).toHaveBeenCalledTimes(1);
    });
});

describe('createMethod — 回调模式', () => {
    it('提供 success 进入回调模式，返回 undefined', async () => {
        const request = createMethod('request', { engine: engine() });
        const success = jest.fn();
        const ret = request({ success });
        expect(ret).toBeUndefined();
        await new Promise((r) => setTimeout(r, 10));
        expect(success).toHaveBeenCalledTimes(1);
        expect((success.mock.calls[0][0] as Response).data).toEqual({ ok: true });
    });

    it('成功时触发 success 与 complete', async () => {
        const request = createMethod('request', { engine: engine() });
        const success = jest.fn();
        const complete = jest.fn();
        request({ success, complete });
        await new Promise((r) => setTimeout(r, 10));
        expect(success).toHaveBeenCalledTimes(1);
        expect(complete).toHaveBeenCalledTimes(1);
    });

    it('失败时触发 fail 与 complete（带错误）', async () => {
        const request = createMethod('request', { engine: engine({ fail: { errMsg: 'x' } }) });
        const fail = jest.fn();
        const complete = jest.fn();
        request({ fail, complete });
        await new Promise((r) => setTimeout(r, 10));
        expect(fail).toHaveBeenCalledWith({ errMsg: 'x' });
        expect(complete).toHaveBeenCalledWith({ errMsg: 'x' });
    });

    it('仅 complete 时进入回调模式且失败带 err', async () => {
        const request = createMethod('request', { engine: engine({ fail: { errMsg: 'y' } }) });
        const complete = jest.fn();
        const ret = request({ complete });
        expect(ret).toBeUndefined();
        await new Promise((r) => setTimeout(r, 10));
        expect(complete).toHaveBeenCalledWith({ errMsg: 'y' });
    });

    it('仅 success 时失败不触发 success，但触发 complete', async () => {
        const request = createMethod('request', { engine: engine({ fail: { errMsg: 'z' } }) });
        const success = jest.fn();
        const complete = jest.fn();
        request({ success, complete });
        await new Promise((r) => setTimeout(r, 10));
        expect(success).not.toHaveBeenCalled();
        expect(complete).toHaveBeenCalledWith({ errMsg: 'z' });
    });
});

describe('createMethod — 拦截器链', () => {
    it('方法默认拦截器与单次 ext.interceptors 按顺序运行', async () => {
        const order: string[] = [];
        const def: Interceptor = async (ctx, next) => {
            order.push('def-before');
            await next();
            order.push('def-after');
        };
        const call: Interceptor = async (ctx, next) => {
            order.push('call-before');
            await next();
            order.push('call-after');
        };
        const request = createMethod('request', { engine: engine(), interceptors: [def] });
        await request({ ext: { interceptors: [call] } });
        expect(order).toEqual(['def-before', 'call-before', 'call-after', 'def-after']);
    });

    it('单次拦截器可改写 result', async () => {
        const request = createMethod('request', { engine: engine() });
        const add: Interceptor = async (ctx, next) => {
            await next();
            (ctx.result as any).extra = 1;
        };
        const r = (await request({ ext: { interceptors: [add] } })) as any;
        expect(r.extra).toBe(1);
    });

    it('默认拦截器在方法实例上持久（多次调用都生效）', async () => {
        let count = 0;
        const def: Interceptor = async (ctx, next) => {
            count++;
            await next();
        };
        const request = createMethod('request', { engine: engine(), interceptors: [def] });
        await request({});
        await request({});
        expect(count).toBe(2);
    });
});
