import * as api from '../src/index';

describe('@mini-dev/request-tt 导出面', () => {
    it('导出便捷单例 request 与工厂', () => {
        expect(typeof api.request).toBe('function');
        expect(typeof api.createRequest).toBe('function');
        expect(typeof api.createTtEngine).toBe('function');
    });

    it('导出 request 的用户态方法', () => {
        expect(typeof api.request.addRequestInterceptor).toBe('function');
        expect(typeof api.request.addResponseInterceptor).toBe('function');
        // create / mount 已移除
        expect((api.request as any).create).toBeUndefined();
        expect((api.request as any).mount).toBeUndefined();
    });

    it('request 单例方法可调用', () => {
        const fn = () => 0;
        expect(api.request.addRequestInterceptor(fn)).toBe(api.request);
        expect(api.request.addResponseInterceptor(fn)).toBe(api.request);
    });

    it('再导出核心能力', () => {
        expect(api.createMethod).toBeInstanceOf(Function);
        expect(api.RequestError).toBeInstanceOf(Function);
        expect(api.Response).toBeInstanceOf(Function);
        expect(api.ChunkThrough).toBeInstanceOf(Function);
        expect(api.AbortController).toBeInstanceOf(Function);
        expect(api.AbortControllerPolyfill).toBeInstanceOf(Function);
        expect(api.AbortSignal).toBeInstanceOf(Function);
        expect(typeof api.normalizeRequestOptions).toBe('function');
        expect(typeof api.isTransientError).toBe('function');
    });

    it('不导出内部实现细节', () => {
        expect((api as any).RequestCache).toBeUndefined();
        expect((api as any).compose).toBeUndefined();
        expect((api as any).core).toBeUndefined();
        expect((api as any).mapToCore).toBeUndefined();
    });
});
