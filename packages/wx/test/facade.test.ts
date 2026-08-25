import { createRequest } from '../src/facade';
import { Response, RequestError } from '@mini-dev/request';

/** 假 engine：记录入参，返回一个填好的 Response。 */
function mockEngine() {
    const calls: any[] = [];
    const engine = {
        request(args: any, signal?: any) {
            calls.push({ args, signal });
            const r = new Response(false, true);
            r.setHeaders(args.headers, 200, undefined);
            r.resolve('data');
            return Promise.resolve(r);
        }
    };
    return { engine, calls };
}

describe('createRequest facade', () => {
    it('无 engine 时 handle 抛 No engine found（无 wx 环境）', async () => {
        const req = createRequest(null);
        await expect(req({ url: 'x' })).rejects.toMatchObject({ code: 'UNSUPPORTED' });
    });

    it('mock engine：返回 Response，可读 data/headers', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        const res = await req({ url: 'u', header: { h: '1' } });
        expect(res.data).toBe('data');
        expect(res.statusCode).toBe(200);
        expect(calls[0].args).toMatchObject({ url: 'u', headers: { h: '1' } });
        expect(calls[0].args).not.toHaveProperty('header');
    });

    it('method 缺省不再写入 GET（透传 undefined）', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        await req({ url: 'u' });
        expect(calls[0].args.method).toBeUndefined();
    });

    it('无参调用走默认 {} option（method 仍透传 undefined）', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        await req();
        expect(calls[0].args.method).toBeUndefined();
    });

    it('headers/header 归一为 canonical headers（header 别名优先）', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        await req({ url: 'u', headers: { a: '1' } });
        expect(calls[0].args.headers).toEqual({ a: '1' });
        expect(calls[0].args).not.toHaveProperty('header');
        await req({ url: 'u', header: { b: '2' }, headers: { a: '1' } });
        expect(calls[1].args.headers).toEqual({ b: '2' });
        expect(calls[1].args).not.toHaveProperty('header');
    });

    it('params：GET 且无 data → 合并进 data', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        await req({ url: 'u', method: 'GET', params: { a: 1 } });
        expect(calls[0].args.data).toEqual({ a: 1 });
    });

    it('params：GET 且已设 data → params 静默忽略', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        await req({ url: 'u', method: 'GET', data: { b: 2 }, params: { a: 1 } });
        expect(calls[0].args.data).toEqual({ b: 2 });
    });

    it('params：非 GET → 拼到 url，data 单独保留', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        await req({ url: 'http://x/y', method: 'POST', data: { b: 2 }, params: { a: 1 } });
        expect(calls[0].args.url).toBe('http://x/y?a=1');
        expect(calls[0].args.data).toEqual({ b: 2 });
    });

    it('顶层库控制原样透传给 engine（不剥离）；engine 第 2 入参 signal 为空', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        const ac = new AbortController();
        await req({ url: 'u', signal: ac.signal, timeout: 3000, maxAge: 5000, retry: 2 });
        expect(calls[0].args.signal).toBe(ac.signal);
        expect(calls[0].args.timeout).toBe(3000);
        expect(calls[0].args.maxAge).toBe(5000);
        expect(calls[0].args.retry).toBe(2);
        expect(calls[0].signal).toBeUndefined();
    });

    it('库控制放 ext → 不进 canonical、不透传给 engine；ext.signal 作为 engine 第 2 入参', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        const ac = new AbortController();
        await req({ url: 'u', ext: { signal: ac.signal, timeout: 3000, maxAge: 5000, retry: 2 } });
        expect(calls[0].args).not.toHaveProperty('signal');
        expect(calls[0].args).not.toHaveProperty('timeout');
        expect(calls[0].args).not.toHaveProperty('maxAge');
        expect(calls[0].args).not.toHaveProperty('retry');
        expect(calls[0].args).not.toHaveProperty('ext');
        expect(calls[0].signal).toBe(ac.signal);
    });

    it('enableChunked / enableChunkedBuffer 原样透传给 engine', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        await req({ url: 'u', enableChunked: true, enableChunkedBuffer: false });
        expect(calls[0].args.enableChunked).toBe(true);
        expect(calls[0].args.enableChunkedBuffer).toBe(false);
    });

    it('顶层 interceptors 原样透传给 engine（不剥离、不激活）', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        const ic = [async (_ctx: any, next: any) => next()];
        await req({ url: 'u', interceptors: ic } as any);
        expect(calls[0].args.interceptors).toBe(ic);
    });

    it('createRequest() 缺省懒绑 wx 全局（设置 global.wx）', async () => {
        const fakeVendor = {
            request(option: any) {
                option.success({ data: 'from-wx', header: {}, statusCode: 200 });
                return { abort() {}, onHeadersReceived() {}, onChunkReceived() {} };
            }
        };
        (global as any).wx = fakeVendor;
        try {
            const req = createRequest();
            expect(req.engine).not.toBeNull();
            const res = await req({ url: 'u' });
            expect(res.data).toBe('from-wx');
        } finally {
            delete (global as any).wx;
        }
    });

    it('createRequest() 无 wx 无 engine → engine 为 null', () => {
        expect(createRequest().engine).toBe(null);
    });
});

describe('facade 拦截器', () => {
    it('request 拦截器：unshift，先添加的后执行', async () => {
        const { engine } = mockEngine();
        const req = createRequest(engine);
        const order: string[] = [];
        req.addRequestInterceptor((r) => {
            order.push('a');
            return r;
        }).addRequestInterceptor((r) => {
            order.push('b');
            return r;
        });
        await req({ url: 'u' });
        expect(order).toEqual(['b', 'a']);
    });

    it('response 拦截器：push，先添加的先执行，第二参数为原始 req', async () => {
        const { engine } = mockEngine();
        const req = createRequest(engine);
        const order: string[] = [];
        req.addResponseInterceptor((res, r) => {
            order.push('a');
            expect(r.url).toBe('u');
            return res;
        }).addResponseInterceptor((res, r) => {
            order.push('b');
            return res;
        });
        await req({ url: 'u' });
        expect(order).toEqual(['a', 'b']);
    });

    it('request 拦截器可改写 req（影响 engine 入参）', async () => {
        const { engine, calls } = mockEngine();
        const req = createRequest(engine);
        req.addRequestInterceptor((r) => {
            r.data = { source: 'custom' };
            return r;
        });
        await req({ url: 'u' });
        expect(calls[0].args.data).toEqual({ source: 'custom' });
    });

    it('拦截器返回 Promise 被等待', async () => {
        const { engine } = mockEngine();
        const req = createRequest(engine);
        const order: string[] = [];
        req.addRequestInterceptor(
            (r) => new Promise((resolve) => setTimeout(() => { order.push('p'); resolve(r); }, 10))
        );
        await req({ url: 'u' });
        expect(order).toEqual(['p']);
    });

    it('拦截器同步抛出 → 整个 handle reject', async () => {
        const { engine } = mockEngine();
        const req = createRequest(engine);
        req.addRequestInterceptor(() => {
            throw new Error('boom');
        });
        await expect(req({ url: 'u' })).rejects.toThrow('boom');
    });

    it('add*Interceptor 返回 this 供链式', () => {
        const { engine } = mockEngine();
        const req = createRequest(engine);
        expect(req.addRequestInterceptor(() => 0)).toBe(req);
        expect(req.addResponseInterceptor(() => 0)).toBe(req);
    });
});

describe('facade createRequest 工厂', () => {
    it('createRequest(e) 多次产出独立实例，互不影响拦截器', async () => {
        const ea = mockEngine();
        const eb = mockEngine();
        const a = createRequest(ea.engine);
        const b = createRequest(eb.engine);
        a.addRequestInterceptor((r) => {
            (r as any).mark = 'a';
            return r;
        });
        await b({ url: 'u' });
        await a({ url: 'u' });
        expect((eb.calls[0].args)).not.toHaveProperty('mark');
        expect((ea.calls[0].args)).toHaveProperty('mark');
    });

    it('createRequest(otherEngine) 使用自定义 engine', async () => {
        const other = mockEngine();
        const r2 = createRequest(other.engine);
        await r2({ url: 'from-other' });
        expect(other.calls[0].args.url).toBe('from-other');
    });
});

describe('facade engine 属性', () => {
    it('engine 暴露为传入的 engine', () => {
        const { engine } = mockEngine();
        const req = createRequest(engine);
        expect(req.engine).toBe(engine);
    });
    it('createRequest(null).engine 为 null', () => {
        expect(createRequest(null).engine).toBe(null);
    });
});
