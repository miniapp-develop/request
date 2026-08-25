import * as api from '../src/index';
import { createMethod, RequestError, Response, ChunkThrough, AbortController, AbortControllerPolyfill, AbortSignal, normalizeRequestOptions, createConvenienceRequest } from '../src/index';

describe('index exports', () => {
    it('导出核心公开符号', () => {
        expect(typeof createMethod).toBe('function');
        expect(RequestError).toBeDefined();
        expect(Response).toBeDefined();
        expect(ChunkThrough).toBeDefined();
        expect(typeof AbortController).toBe('function');
        expect(typeof AbortControllerPolyfill).toBe('function');
        expect(typeof AbortSignal).toBe('function');
        expect(typeof normalizeRequestOptions).toBe('function');
        expect(typeof createConvenienceRequest).toBe('function');
    });

    it('不导出默认单例（核心无平台单例，由各平台库提供）', () => {
        expect((api as any).default).toBeUndefined();
        expect((api as any).request).toBeUndefined();
    });

    it('不导出内部实现', () => {
        expect((api as any).RequestCache).toBeUndefined();
        expect((api as any).compose).toBeUndefined();
        expect((api as any).core).toBeUndefined();
        expect((api as any).createAbortInterceptor).toBeUndefined();
        expect((api as any).createTimeoutInterceptor).toBeUndefined();
        expect((api as any).createCacheInterceptor).toBeUndefined();
        expect((api as any).runWithRetry).toBeUndefined();
    });
});
