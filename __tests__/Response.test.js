const Response = require('../libs/Response');

describe('Response[enableChunked = false]', () => {
    test('_onHeadersReceived sets headers, statusCode and cookies', () => {
        const response = new Response(false);
        response._onHeadersReceived({ header: { a: '1' }, statusCode: 200, cookies: ['c=1'] });

        expect(response.headers).toEqual({ a: '1' });
        expect(response.header).toEqual({ a: '1' });
        expect(response.statusCode).toBe(200);
        expect(response.cookies).toEqual(['c=1']);
    });

    test('_onSuccess sets data from res.data', () => {
        const response = new Response(false);
        response._onSuccess({ data: 'plain body' });

        expect(response.data).toBe('plain body');
        expect(response.enableChunked).toBe(false);
    });

    test('_onFail does not throw when not chunked', () => {
        const response = new Response(false);

        expect(() => response._onFail(new Error('boom'))).not.toThrow();
    });
});

describe('Response[enableChunked = true]', () => {
    test('_onChunkReceived emits data on the underlying ChunkThrough', () => {
        const response = new Response(true);
        const handler = jest.fn();
        response.data.on('data', handler);

        response._onChunkReceived({ data: 'chunk-1' });

        expect(handler).toHaveBeenCalledWith('chunk-1');
        expect(response.enableChunked).toBe(true);
    });

    test('_onSuccess ends the underlying ChunkThrough', () => {
        const response = new Response(true);
        const endHandler = jest.fn();
        response.data.on('end', endHandler);

        response._onSuccess({});

        expect(endHandler).toHaveBeenCalled();
    });

    test('_onFail propagates error to the underlying ChunkThrough', () => {
        const response = new Response(true);
        const errorHandler = jest.fn();
        response.data.on('error', errorHandler);
        const err = new Error('network fail');

        response._onFail(err);

        expect(errorHandler).toHaveBeenCalledWith(err);
    });

    test('default enableChunkedBuffer is true so chunks emitted before on() are buffered', () => {
        const response = new Response(true);
        response._onChunkReceived({ data: 'pre' });

        const handler = jest.fn();
        response.data.on('data', handler);

        expect(handler).toHaveBeenCalledWith('pre');
    });
});
