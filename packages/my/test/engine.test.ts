import { createMyEngine } from '../src/engine';
import { RequestError } from '@mini-dev/request';

/**
 * 构造一个假支付宝 vendor：request 返回假 RequestTask（仅 abort，无 chunk 事件），回调由测试驱动。
 * 支付宝 my.request success res = { data, status, headers }；fail err = { error, errorMessage }。
 */
function fakeVendor() {
    const calls: any[] = [];
    let successFn: ((res: any) => void) | null = null;
    let failFn: ((err: any) => void) | null = null;
    const task = {
        aborted: false,
        abort() {
            task.aborted = true;
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
        fireSuccess(res: any) {
            successFn?.(res);
        },
        fireFail(err: any) {
            failFn?.(err);
        }
    };
}

describe('createMyEngine', () => {
    it('success：resolve Response，带 data/headers/statusCode（由 status 映射），无 cookies', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'x', method: 'GET' });
        f.fireSuccess({ data: 'hello', status: 200, headers: { a: '1' } });
        const res = await p;
        expect(res.enableChunked).toBe(false);
        expect(res.data).toBe('hello');
        expect(res.headers).toEqual({ a: '1' });
        expect(res.statusCode).toBe(200);
        expect(res.cookies).toBeUndefined();
    });

    it('fail：reject 原生错误（{ error, errorMessage } 原样透传）', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireFail({ error: 12, errorMessage: '网络错误' });
        await expect(p).rejects.toMatchObject({ error: 12, errorMessage: '网络错误' });
    });

    it('canonical headers 原样透传给 my.request（identity，my 原生即 headers，无映射）', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'u', method: 'POST', data: { a: 1 }, headers: { h: '1' } });
        f.fireSuccess({ data: 'ok', status: 200, headers: {} });
        await p;
        expect(f.calls[0]).toMatchObject({ url: 'u', method: 'POST', data: { a: 1 }, headers: { h: '1' } });
        expect(f.calls[0]).not.toHaveProperty('header');
        expect(f.calls[0].success).toBeInstanceOf(Function);
        expect(f.calls[0].fail).toBeInstanceOf(Function);
    });

    it('仅 headers 也原样透传（identity）', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'u', headers: { a: '1' } });
        f.fireSuccess({ data: 'ok', status: 200, headers: {} });
        await p;
        expect(f.calls[0].headers).toEqual({ a: '1' });
        expect(f.calls[0]).not.toHaveProperty('header');
    });

    it('success 已结算后再到 fail：走 else 分支清理监听，不重复 reject', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireSuccess({ data: 'ok', status: 200, headers: {} });
        const res = await p;
        expect(res.data).toBe('ok');
        // 已 settle 后再 fire fail：不应 reject（否则产生未捕获 rejection）
        f.fireFail({ error: 99, errorMessage: '迟到的失败' });
        await new Promise((r) => setTimeout(r, 10));
    });

    it('enableChunked 在支付宝被忽略：始终非 chunked Response，整段 data', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'x', enableChunked: true });
        f.fireSuccess({ data: 'whole-body', status: 200, headers: { h: '1' } });
        const res = await p;
        expect(res.enableChunked).toBe(false);
        expect(res.data).toBe('whole-body');
    });

    it('enableChunked 原样透传给原生（支付宝忽略未知字段）', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'x', enableChunked: true });
        f.fireSuccess({ data: 'ok', status: 200, headers: {} });
        await p;
        expect(f.calls[0].enableChunked).toBe(true);
    });

    it('请求前 signal 已 abort：短路 reject CANCELLED，不发真实请求', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const ac = new AbortController();
        ac.abort();
        await expect(engine.request({ url: 'x' }, ac.signal)).rejects.toMatchObject({ code: 'CANCELLED' });
        expect(f.calls.length).toBe(0);
    });

    it('请求中 signal abort：engine 调 task.abort() 真正取消', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const ac = new AbortController();
        const p = engine.request({ url: 'x' }, ac.signal);
        expect(f.task.aborted).toBe(false);
        ac.abort();
        expect(f.task.aborted).toBe(true);
        f.fireFail({ error: 20, errorMessage: '取消请求' });
        await expect(p).rejects.toMatchObject({ error: 20 });
    });

    it('请求成功后 signal abort 不再影响（监听已移除）', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const ac = new AbortController();
        const p = engine.request({ url: 'x' }, ac.signal);
        f.fireSuccess({ data: 'ok', status: 200, headers: {} });
        await p;
        ac.abort();
        await new Promise((r) => setTimeout(r, 10));
        expect(f.task.aborted).toBe(false);
    });

    it('不带 signal：纯透传，不挂监听', async () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireSuccess({ data: 'ok', status: 200, headers: {} });
        await expect(p).resolves.toBeTruthy();
    });

    it('engine 形状：request/isTransientError 为 function，isTransientError 判定终态码', () => {
        const f = fakeVendor();
        const engine = createMyEngine(f.vendor);
        expect(typeof engine.request).toBe('function');
        expect(typeof engine.isTransientError).toBe('function');
        // 取消码 20 = 终态
        expect(engine.isTransientError?.({ error: 20, errorMessage: '取消请求' })).toBe(false);
        // 网络码 12 = 瞬态
        expect(engine.isTransientError?.({ error: 12, errorMessage: '网络错误' })).toBe(true);
    });

    it('createMyEngine() 缺省参数懒绑 global.my', async () => {
        const f = fakeVendor();
        (global as any).my = f.vendor;
        try {
            const engine = createMyEngine();
            const p = engine.request({ url: 'x' });
            f.fireSuccess({ data: 'ok', status: 200, headers: {} });
            await expect(p).resolves.toBeTruthy();
        } finally {
            delete (global as any).my;
        }
    });

    it('RequestError 仍可用作短路错误类型', () => {
        expect(new RequestError('CANCELLED', 'x')).toBeInstanceOf(RequestError);
    });
});
