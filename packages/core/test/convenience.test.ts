import { normalizeRequestOptions, createConvenienceRequest } from '../src/convenience';
import { Response } from '../src/Response';
import { RequestError } from '../src/errors';
import type { RequestEngine } from '../src/types';

describe('normalizeRequestOptions', () => {
    it('缺省 method 不再写入 GET（原样透传，由原生默认）', () => {
        expect(normalizeRequestOptions({ url: 'http://x' }).method).toBeUndefined();
    });

    it('显式 method 保留（不大写化）', () => {
        expect(normalizeRequestOptions({ url: 'http://x', method: 'post' }).method).toBe('post');
    });

    it('headers 归一为 canonical headers（header 未设时）', () => {
        const o = normalizeRequestOptions({ url: 'http://x', headers: { a: 1 } });
        expect(o.headers).toEqual({ a: 1 });
        expect(o.header).toBeUndefined();
    });

    it('双写缺省 nativeHeaderKey=headers（平台中立，canonical 名优先）', () => {
        const o = normalizeRequestOptions({ url: 'http://x', header: { a: 1 }, headers: { b: 2 } });
        expect(o.headers).toEqual({ b: 2 });
        expect(o.header).toBeUndefined();
    });

    it('双写 nativeHeaderKey=header（wx/tt 原生）→ header 赢', () => {
        const o = normalizeRequestOptions({ url: 'http://x', header: { a: 1 }, headers: { b: 2 } }, 'header');
        expect(o.headers).toEqual({ a: 1 });
        expect(o.header).toBeUndefined();
    });

    it('双写 nativeHeaderKey=headers（my 原生）→ headers 赢', () => {
        const o = normalizeRequestOptions({ url: 'http://x', header: { a: 1 }, headers: { b: 2 } }, 'headers');
        expect(o.headers).toEqual({ b: 2 });
        expect(o.header).toBeUndefined();
    });

    it('nativeHeaderKey=header 但仅设 headers → 回退取 headers', () => {
        const o = normalizeRequestOptions({ url: 'http://x', headers: { b: 2 } }, 'header');
        expect(o.headers).toEqual({ b: 2 });
        expect(o.header).toBeUndefined();
    });

    it('nativeHeaderKey=headers 但仅设 header → 回退取 header', () => {
        const o = normalizeRequestOptions({ url: 'http://x', header: { a: 1 } }, 'headers');
        expect(o.headers).toEqual({ a: 1 });
        expect(o.header).toBeUndefined();
    });

    it('仅 header 别名也归一为 canonical headers', () => {
        const o = normalizeRequestOptions({ url: 'http://x', header: { a: 1 } });
        expect(o.headers).toEqual({ a: 1 });
        expect(o.header).toBeUndefined();
    });

    it('GET + params（无 data）合并进 data', () => {
        const o = normalizeRequestOptions({ url: 'http://x', method: 'GET', params: { a: 1 } });
        expect(o.data).toEqual({ a: 1 });
    });

    it('GET + 已设 data 时 params 被静默忽略', () => {
        const o = normalizeRequestOptions({ url: 'http://x', method: 'GET', data: { b: 2 }, params: { a: 1 } });
        expect(o.data).toEqual({ b: 2 });
    });

    it('POST + params 拼到 url，data 保留', () => {
        const o = normalizeRequestOptions({ url: 'http://x', method: 'POST', data: { b: 2 }, params: { a: 1 } });
        expect(o.url).toBe('http://x?a=1');
        expect(o.data).toEqual({ b: 2 });
    });

    it('POST + params 拼到已有 query', () => {
        const o = normalizeRequestOptions({ url: 'http://x?z=0', method: 'POST', params: { a: 1 } });
        expect(o.url).toBe('http://x?z=0&a=1');
    });

    it('缺省 method + params 按原生 GET 默认路由（params 进 data，不写回 method）', () => {
        const o = normalizeRequestOptions({ url: 'http://x', params: { a: 1 } });
        expect(o.method).toBeUndefined();
        expect(o.data).toEqual({ a: 1 });
    });

    it('不改原入参', () => {
        const orig: Record<string, unknown> = { url: 'http://x', method: 'POST', params: { a: 1 } };
        normalizeRequestOptions(orig);
        expect(orig.url).toBe('http://x');
        expect(orig.data).toBeUndefined();
    });

    it('无 params 时 url 不变', () => {
        expect(normalizeRequestOptions({ url: 'http://x', method: 'POST' }).url).toBe('http://x');
    });
});

/** 假 engine：记录入参，返回一个填好的 Response。 */
function mockEngine() {
    const calls: any[] = [];
    const engine: RequestEngine = {
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

/** 把一个 vendor.request（wx/my/tt 形态）包成核心 engine，用于懒绑路径。 */
function vendorEngine(vendor: any): RequestEngine {
    return {
        request(args: any) {
            return new Promise<Response>((resolve) => {
                vendor.request({
                    ...args,
                    success(res: any) {
                        const r = new Response(false, true);
                        r.setHeaders(res.header, res.statusCode, undefined);
                        r.resolve(res.data);
                        resolve(r);
                    }
                });
            });
        }
    };
}

const noGlobal = () => null;

describe('createConvenienceRequest', () => {
    it('无 engine 且无全局 → handle 抛 No engine found', async () => {
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, null);
        expect(req.engine).toBeNull();
        await expect(req({ url: 'x' })).rejects.toBeInstanceOf(RequestError);
        await expect(req({ url: 'x' })).rejects.toMatchObject({ code: 'UNSUPPORTED' });
    });

    it('传入 engine → 直接使用，不调 getGlobal', async () => {
        let globalCalls = 0;
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest(
            { getGlobal: () => { globalCalls++; return null; }, createEngine: vendorEngine },
            engine
        );
        const res = await req({ url: 'u', header: { h: '1' } });
        expect(res.data).toBe('data');
        expect(res.statusCode).toBe(200);
        expect(calls[0].args).toMatchObject({ url: 'u', headers: { h: '1' } });
        expect(calls[0].args).not.toHaveProperty('header');
        expect(globalCalls).toBe(0);
    });

    it('缺省 engine 且全局存在 → 懒绑 createEngine(getGlobal())', async () => {
        const fakeVendor = {
            request(option: any) {
                option.success({ data: 'from-vendor', header: {}, statusCode: 200 });
                return { abort() {}, onHeadersReceived() {}, onChunkReceived() {} };
            }
        };
        const req = createConvenienceRequest({ getGlobal: () => fakeVendor, createEngine: vendorEngine });
        expect(req.engine).not.toBeNull();
        const res = await req({ url: 'u' });
        expect(res.data).toBe('from-vendor');
    });

    it('缺省 engine 且全局为 null → engine 为 null', () => {
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine });
        expect(req.engine).toBeNull();
    });

    it('method 缺省不再写入 GET（透传 undefined）/ 无参调用走默认 {}', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        await req({ url: 'u' });
        expect(calls[0].args.method).toBeUndefined();
        await req();
        expect(calls[1].args.method).toBeUndefined();
    });

    it('headers/header 归一为 canonical headers（缺省 nativeHeaderKey=headers，双写 headers 赢）', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        await req({ url: 'u', headers: { a: '1' } });
        expect(calls[0].args.headers).toEqual({ a: '1' });
        expect(calls[0].args).not.toHaveProperty('header');
        await req({ url: 'u', header: { b: '2' }, headers: { a: '1' } });
        expect(calls[1].args.headers).toEqual({ a: '1' });
        expect(calls[1].args).not.toHaveProperty('header');
    });

    it('注入 nativeHeaderKey=header（wx/tt）→ 双写 header 赢', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest(
            { getGlobal: noGlobal, createEngine: vendorEngine, nativeHeaderKey: 'header' },
            engine
        );
        await req({ url: 'u', header: { b: '2' }, headers: { a: '1' } });
        expect(calls[0].args.headers).toEqual({ b: '2' });
        expect(calls[0].args).not.toHaveProperty('header');
    });

    it('params：GET 无 data 合并进 data / GET 有 data 忽略 / 非 GET 拼到 url', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        await req({ url: 'u', method: 'GET', params: { a: 1 } });
        expect(calls[0].args.data).toEqual({ a: 1 });
        await req({ url: 'u', method: 'GET', data: { b: 2 }, params: { a: 1 } });
        expect(calls[1].args.data).toEqual({ b: 2 });
        await req({ url: 'http://x/y', method: 'POST', data: { b: 2 }, params: { a: 1 } });
        expect(calls[2].args.url).toBe('http://x/y?a=1');
        expect(calls[2].args.data).toEqual({ b: 2 });
    });

    it('顶层库控制原样透传给 engine（库不假设原生参数、不剥离）；engine 第 2 入参 signal 为空', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        const ac = new AbortController();
        await req({ url: 'u', signal: ac.signal, timeout: 3000, maxAge: 5000, retry: 2 });
        // 顶层库控制作为 canonical 透传给 engine，不剥离
        expect(calls[0].args.signal).toBe(ac.signal);
        expect(calls[0].args.timeout).toBe(3000);
        expect(calls[0].args.maxAge).toBe(5000);
        expect(calls[0].args.retry).toBe(2);
        // 未放 ext → engine 第 2 入参 signal 为 undefined
        expect(calls[0].signal).toBeUndefined();
    });

    it('库控制放 ext → 不进 canonical、不透传给 engine；ext.signal 作为 engine 第 2 入参', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        const ac = new AbortController();
        await req({ url: 'u', ext: { signal: ac.signal, timeout: 3000, maxAge: 5000, retry: 2 } });
        // ext 库控制由核心剥离，不进 canonical、不透传给 engine
        expect(calls[0].args).not.toHaveProperty('signal');
        expect(calls[0].args).not.toHaveProperty('timeout');
        expect(calls[0].args).not.toHaveProperty('maxAge');
        expect(calls[0].args).not.toHaveProperty('retry');
        expect(calls[0].args).not.toHaveProperty('ext');
        // ext.signal 作为 engine 第 2 入参
        expect(calls[0].signal).toBe(ac.signal);
    });

    it('enableChunked / enableChunkedBuffer 原样透传给 engine', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        await req({ url: 'u', enableChunked: true, enableChunkedBuffer: false });
        expect(calls[0].args.enableChunked).toBe(true);
        expect(calls[0].args.enableChunkedBuffer).toBe(false);
    });

    it('顶层 interceptors 原样透传给 engine（不剥离、不激活）；ext.interceptors 才激活', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        const ic = [async (_ctx: any, next: any) => next()];
        await req({ url: 'u', interceptors: ic } as any);
        // 顶层 interceptors 作为 canonical 透传给 engine，不剥离
        expect(calls[0].args.interceptors).toBe(ic);
    });

    it('request 拦截器：unshift，先添加的后执行；可改写 req；返回 Promise 被等待', async () => {
        const { engine, calls } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        const order: string[] = [];
        req.addRequestInterceptor((r) => { order.push('a'); return r; })
            .addRequestInterceptor((r) => { order.push('b'); return r; });
        await req({ url: 'u' });
        expect(order).toEqual(['b', 'a']);
        // 改写 req
        const req2 = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        req2.addRequestInterceptor((r) => { r.data = { source: 'custom' }; return r; });
        await req2({ url: 'u' });
        expect(calls[calls.length - 1].args.data).toEqual({ source: 'custom' });
        // Promise 拦截器
        const req3 = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        const p: string[] = [];
        req3.addRequestInterceptor(
            (r) => new Promise((resolve) => setTimeout(() => { p.push('p'); resolve(r); }, 10))
        );
        await req3({ url: 'u' });
        expect(p).toEqual(['p']);
    });

    it('response 拦截器：push，先添加的先执行，第二参数为原始 req', async () => {
        const { engine } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        const order: string[] = [];
        req.addResponseInterceptor((res, r) => { order.push('a'); expect(r.url).toBe('u'); return res; })
            .addResponseInterceptor((res, r) => { order.push('b'); return res; });
        await req({ url: 'u' });
        expect(order).toEqual(['a', 'b']);
    });

    it('request 拦截器同步抛出 → handle reject', async () => {
        const { engine } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        req.addRequestInterceptor(() => { throw new Error('boom'); });
        await expect(req({ url: 'u' })).rejects.toThrow('boom');
    });

    it('add*Interceptor 返回 this 供链式', () => {
        const { engine } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        expect(req.addRequestInterceptor(() => 0)).toBe(req);
        expect(req.addResponseInterceptor(() => 0)).toBe(req);
    });

    it('engine 暴露为传入的 engine', () => {
        const { engine } = mockEngine();
        const req = createConvenienceRequest({ getGlobal: noGlobal, createEngine: vendorEngine }, engine);
        expect(req.engine).toBe(engine);
    });
});
