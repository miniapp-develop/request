import { createWxEngine } from '../src/engine';
import { RequestError } from '@mini-dev/request';

/** 构造一个假 vendor：request 返回假 RequestTask，事件由测试驱动。 */
function fakeVendor() {
    let headersCb: ((d: any) => void) | null = null;
    let chunkCb: ((c: any) => void) | null = null;
    const calls: any[] = [];
    let successFn: ((res: any) => void) | null = null;
    let failFn: ((err: any) => void) | null = null;
    const task = {
        aborted: false,
        abort() {
            task.aborted = true;
        },
        onHeadersReceived(cb: (d: any) => void) {
            headersCb = cb;
        },
        onChunkReceived(cb: (c: any) => void) {
            chunkCb = cb;
        }
    };
    const vendor = {
        request(option: any) {
            calls.push(option);
            successFn = option.success;
            failFn = option.fail;
            return task;
        }
    };
    return {
        vendor,
        task,
        calls,
        fireHeaders(d: any) {
            headersCb?.(d);
        },
        fireChunk(d: any) {
            chunkCb?.(d);
        },
        fireSuccess(res: any) {
            successFn?.(res);
        },
        fireFail(err: any) {
            failFn?.(err);
        }
    };
}

describe('createWxEngine', () => {
    it('非 chunked success：resolve Response，带 data/headers/statusCode', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const p = engine.request({ url: 'x', method: 'GET' });
        f.fireSuccess({ data: 'hello', header: { a: '1' }, statusCode: 200, cookies: ['c'] });
        const res = await p;
        expect(res.enableChunked).toBe(false);
        expect(res.data).toBe('hello');
        expect(res.headers).toEqual({ a: '1' });
        expect(res.statusCode).toBe(200);
        expect(res.cookies).toEqual(['c']);
    });

    it('非 chunked fail：reject 原生错误', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireFail({ errMsg: 'request:fail' });
        await expect(p).rejects.toMatchObject({ errMsg: 'request:fail' });
    });

    it('canonical→native：headers 映射为 wx header，其余原样透传（含 enableChunked）；enableChunkedBuffer 为本库参数，不透传给 wx.request', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const p = engine.request({
            url: 'u',
            method: 'POST',
            data: { a: 1 },
            headers: { h: '1' },
            enableChunked: false,
            enableChunkedBuffer: false
        });
        f.fireSuccess({ data: 'ok' });
        await p;
        expect(f.calls[0]).toMatchObject({ url: 'u', method: 'POST', data: { a: 1 }, header: { h: '1' }, enableChunked: false });
        expect(f.calls[0]).not.toHaveProperty('headers');
        expect(f.calls[0]).not.toHaveProperty('enableChunkedBuffer');
        expect(f.calls[0].success).toBeInstanceOf(Function);
        expect(f.calls[0].fail).toBeInstanceOf(Function);
    });

    it('chunked：首帧 headers 即 resolve，chunk 进流，success 标记流结束', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const p = engine.request({ url: 'x', enableChunked: true });
        f.fireHeaders({ header: { h: '1' }, statusCode: 200 });
        const res = await p;
        expect(res.enableChunked).toBe(true);
        expect(res.headers).toEqual({ h: '1' });
        const chunks: any[] = [];
        (res.data as any).on('data', (c: any) => chunks.push(c));
        f.fireChunk({ data: 'chunk1' });
        f.fireChunk({ data: 'chunk2' });
        f.fireSuccess({ data: '', header: { h: '1' }, statusCode: 200 });
        expect(chunks).toEqual(['chunk1', 'chunk2']);
    });

    it('enableChunkedBuffer 默认 true：监听前到达的 chunk 被缓存', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const p = engine.request({ url: 'x', enableChunked: true });
        f.fireHeaders({ header: {}, statusCode: 200 });
        const res = await p;
        f.fireChunk({ data: 'buffered' });
        const got: any[] = [];
        (res.data as any).on('data', (c: any) => got.push(c));
        expect(got).toEqual(['buffered']);
    });

    it('enableChunkedBuffer=false：监听前到达的 chunk 丢弃', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const p = engine.request({ url: 'x', enableChunked: true, enableChunkedBuffer: false });
        f.fireHeaders({ header: {}, statusCode: 200 });
        const res = await p;
        f.fireChunk({ data: 'dropped' });
        const got: any[] = [];
        (res.data as any).on('data', (c: any) => got.push(c));
        expect(got).toEqual([]);
    });

    it('请求前 signal 已 abort：短路 reject CANCELLED，不发真实请求', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const ac = new AbortController();
        ac.abort();
        await expect(engine.request({ url: 'x' }, ac.signal)).rejects.toMatchObject({ code: 'CANCELLED' });
        expect(f.calls.length).toBe(0);
    });

    it('请求中 signal abort：engine 调 task.abort() 真正取消', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const ac = new AbortController();
        const p = engine.request({ url: 'x' }, ac.signal);
        expect(f.task.aborted).toBe(false);
        ac.abort();
        expect(f.task.aborted).toBe(true);
        // abort 后原生 fail 到达：engine reject 原生错误（abort 中间件侧由核心负责 reject CANCELLED）
        f.fireFail({ errMsg: 'request:fail abort' });
        await expect(p).rejects.toMatchObject({ errMsg: 'request:fail abort' });
    });

    it('请求成功后 signal abort 不再影响（监听已移除）', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const ac = new AbortController();
        const p = engine.request({ url: 'x' }, ac.signal);
        f.fireSuccess({ data: 'ok' });
        await p;
        // 不应抛未捕获 rejection
        ac.abort();
        await new Promise((r) => setTimeout(r, 10));
        expect(f.task.aborted).toBe(false);
    });

    it('chunked 请求中 abort：task.abort 被调，fail 到达后流收到 error', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const ac = new AbortController();
        const p = engine.request({ url: 'x', enableChunked: true }, ac.signal);
        f.fireHeaders({ header: {}, statusCode: 200 });
        const res = await p;
        const errors: any[] = [];
        (res.data as any).on('error', (e: any) => errors.push(e));
        ac.abort();
        expect(f.task.aborted).toBe(true);
        f.fireFail({ errMsg: 'request:fail abort' });
        expect(errors.length).toBe(1);
    });

    it('engine.request 不是 function：core 抛 UNSUPPORTED（由 createMethod 兜底，此处验证 engine 形状）', () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        expect(typeof engine.request).toBe('function');
        expect(typeof engine.isTransientError).toBe('function');
        expect(engine.isTransientError?.({ errMsg: 'request:fail abort' })).toBe(false);
    });

    it('不带 signal：纯透传，不挂监听', async () => {
        const f = fakeVendor();
        const engine = createWxEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireSuccess({ data: 'ok' });
        await expect(p).resolves.toBeTruthy();
    });

    it('createWxEngine() 缺省参数懒绑 global.wx', async () => {
        const f = fakeVendor();
        (global as any).wx = f.vendor;
        try {
            const engine = createWxEngine();
            const p = engine.request({ url: 'x' });
            f.fireSuccess({ data: 'ok' });
            await expect(p).resolves.toBeTruthy();
        } finally {
            delete (global as any).wx;
        }
    });

    it('RequestError 仍可用作短路错误类型', () => {
        expect(new RequestError('CANCELLED', 'x')).toBeInstanceOf(RequestError);
    });
});
