import { createTtEngine } from '../src/engine';
import { RequestError } from '@mini-dev/request';

/**
 * 构造一个假抖音 vendor：request 返回假 RequestTask（仅 abort，无 chunk 事件），回调由测试驱动。
 * 抖音 tt.request success res = { errMsg, statusCode, profile, data }（官方文档未列 header/cookies）；
 * fail err = { errMsg: 'request:fail ...' }。
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

describe('createTtEngine', () => {
    it('success：resolve Response，带 data/headers/statusCode/cookies（若平台返回）', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'x', method: 'GET' });
        f.fireSuccess({ data: 'hello', statusCode: 200, header: { a: '1' }, cookies: ['c'] });
        const res = await p;
        expect(res.enableChunked).toBe(false);
        expect(res.data).toBe('hello');
        expect(res.headers).toEqual({ a: '1' });
        expect(res.statusCode).toBe(200);
        expect(res.cookies).toEqual(['c']);
    });

    it('success 无 header（官方文档未列）：res.headers 为 undefined', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireSuccess({ data: 'hello', statusCode: 200 });
        const res = await p;
        expect(res.data).toBe('hello');
        expect(res.statusCode).toBe(200);
        expect(res.headers).toBeUndefined();
        expect(res.cookies).toBeUndefined();
    });

    it('fail：reject 原生错误（{ errMsg } 原样透传）', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireFail({ errMsg: 'request:fail timeout' });
        await expect(p).rejects.toMatchObject({ errMsg: 'request:fail timeout' });
    });

    it('canonical→native：headers 映射为 tt header，其余原样透传', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'u', method: 'POST', data: { a: 1 }, headers: { h: '1' } });
        f.fireSuccess({ data: 'ok', statusCode: 200 });
        await p;
        expect(f.calls[0]).toMatchObject({ url: 'u', method: 'POST', data: { a: 1 }, header: { h: '1' } });
        expect(f.calls[0]).not.toHaveProperty('headers');
        expect(f.calls[0].success).toBeInstanceOf(Function);
        expect(f.calls[0].fail).toBeInstanceOf(Function);
    });

    it('enableChunked 在抖音被忽略：始终非 chunked Response，整段 data', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'x', enableChunked: true });
        f.fireSuccess({ data: 'whole-body', statusCode: 200 });
        const res = await p;
        expect(res.enableChunked).toBe(false);
        expect(res.data).toBe('whole-body');
    });

    it('enableChunked 原样透传给原生（抖音忽略未知字段）', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'x', enableChunked: true });
        f.fireSuccess({ data: 'ok', statusCode: 200 });
        await p;
        expect(f.calls[0].enableChunked).toBe(true);
    });

    it('请求前 signal 已 abort：短路 reject CANCELLED，不发真实请求', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const ac = new AbortController();
        ac.abort();
        await expect(engine.request({ url: 'x' }, ac.signal)).rejects.toMatchObject({ code: 'CANCELLED' });
        expect(f.calls.length).toBe(0);
    });

    it('请求中 signal abort：engine 调 task.abort() 真正取消', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const ac = new AbortController();
        const p = engine.request({ url: 'x' }, ac.signal);
        expect(f.task.aborted).toBe(false);
        ac.abort();
        expect(f.task.aborted).toBe(true);
        f.fireFail({ errMsg: 'request:fail abort' });
        await expect(p).rejects.toMatchObject({ errMsg: 'request:fail abort' });
    });

    it('请求成功后 signal abort 不再影响（监听已移除）', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const ac = new AbortController();
        const p = engine.request({ url: 'x' }, ac.signal);
        f.fireSuccess({ data: 'ok', statusCode: 200 });
        await p;
        ac.abort();
        await new Promise((r) => setTimeout(r, 10));
        expect(f.task.aborted).toBe(false);
    });

    it('success 已结算后再到 fail：走 else 分支清理监听，不重复 reject', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireSuccess({ data: 'ok', statusCode: 200 });
        const res = await p;
        expect(res.data).toBe('ok');
        f.fireFail({ errMsg: 'request:fail late' });
        await new Promise((r) => setTimeout(r, 10));
    });

    it('不带 signal：纯透传，不挂监听', async () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        const p = engine.request({ url: 'x' });
        f.fireSuccess({ data: 'ok', statusCode: 200 });
        await expect(p).resolves.toBeTruthy();
    });

    it('engine 形状：request/isTransientError 为 function，isTransientError 判定取消类终态', () => {
        const f = fakeVendor();
        const engine = createTtEngine(f.vendor);
        expect(typeof engine.request).toBe('function');
        expect(typeof engine.isTransientError).toBe('function');
        // 取消 = 终态
        expect(engine.isTransientError?.({ errMsg: 'request:fail abort' })).toBe(false);
        // 网络抖动 / 超时 = 瞬态
        expect(engine.isTransientError?.({ errMsg: 'request:fail timeout' })).toBe(true);
    });

    it('createTtEngine() 缺省参数懒绑 global.tt', async () => {
        const f = fakeVendor();
        (global as any).tt = f.vendor;
        try {
            const engine = createTtEngine();
            const p = engine.request({ url: 'x' });
            f.fireSuccess({ data: 'ok', statusCode: 200 });
            await expect(p).resolves.toBeTruthy();
        } finally {
            delete (global as any).tt;
        }
    });

    it('RequestError 仍可用作短路错误类型', () => {
        expect(new RequestError('CANCELLED', 'x')).toBeInstanceOf(RequestError);
    });
});
