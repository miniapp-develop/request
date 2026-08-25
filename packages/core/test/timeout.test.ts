import { createTimeoutInterceptor } from '../src/middleware/timeout';
import type { RequestContext, RequestEngine } from '../src/types';

function ctx(ext: any): RequestContext {
    return {
        method: 'request',
        options: { ext } as any,
        canonical: {},
        ext,
        engine: {} as RequestEngine,
        result: undefined,
        state: {}
    };
}

describe('createTimeoutInterceptor', () => {
    it('无 timeout / <=0 透传', async () => {
        const next = jest.fn(async () => {});
        await createTimeoutInterceptor()(ctx({}), next);
        await createTimeoutInterceptor()(ctx({ timeout: 0 }), next);
        await createTimeoutInterceptor()(ctx({ timeout: -1 }), next);
        expect(next).toHaveBeenCalledTimes(3);
    });

    it('超时抛 TIMEOUT', async () => {
        const next = jest.fn(
            () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50))
        );
        await expect(createTimeoutInterceptor()(ctx({ timeout: 20 }), next)).rejects.toMatchObject({
            code: 'TIMEOUT'
        });
        await new Promise((r) => setTimeout(r, 60));
    });

    it('在超时前完成则 resolve', async () => {
        const next = jest.fn(async () => {});
        await createTimeoutInterceptor()(ctx({ timeout: 50 }), next);
        expect(next).toHaveBeenCalled();
    });

    it('next 失败透传错误', async () => {
        const next = jest.fn(async () => {
            throw new Error('boom');
        });
        await expect(createTimeoutInterceptor()(ctx({ timeout: 50 }), next)).rejects.toThrow('boom');
    });

    it('超时先结算后 next 才失败：忽略迟到的 next reject', async () => {
        const next = jest.fn(
            () =>
                new Promise<void>((_resolve, reject) => {
                    setTimeout(() => reject(new Error('late')), 30);
                })
        );
        await expect(createTimeoutInterceptor()(ctx({ timeout: 10 }), next)).rejects.toMatchObject({
            code: 'TIMEOUT'
        });
        await new Promise((r) => setTimeout(r, 40));
    });
});
