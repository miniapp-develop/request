import { Response } from '../src/Response';
import { ChunkThrough } from '../src/ChunkThrough';

describe('Response — 非 chunked', () => {
    it('构造时 data 为空串，enableChunked=false', () => {
        const res = new Response();
        expect(res.enableChunked).toBe(false);
        expect(res.data).toBe('');
    });

    it('setHeaders 写入 headers/statusCode/cookies，getters 读取', () => {
        const res = new Response();
        res.setHeaders({ a: 1 }, 200, ['x=1']);
        expect(res.headers).toEqual({ a: 1 });
        expect(res.header).toEqual({ a: 1 }); // header 是 headers 的别名
        expect(res.statusCode).toBe(200);
        expect(res.cookies).toEqual(['x=1']);
    });

    it('resolve 写入响应体', () => {
        const res = new Response();
        res.resolve({ ok: true });
        expect(res.data).toEqual({ ok: true });
    });

    it('emitChunk / reject 在非 chunked 下为 no-op', () => {
        const res = new Response();
        res.emitChunk('x');
        res.reject(new Error('boom'));
        expect(res.data).toBe('');
    });

    it('cookies 默认 undefined', () => {
        expect(new Response().cookies).toBeUndefined();
    });
});

describe('Response — chunked', () => {
    it('构造时 data 为 ChunkThrough，enableChunked=true', () => {
        const res = new Response(true, true);
        expect(res.enableChunked).toBe(true);
        expect(res.data).toBeInstanceOf(ChunkThrough);
    });

    it('emitChunk 把数据推入流，监听可收到', () => {
        const res = new Response(true, true);
        const stream = res.data as ChunkThrough;
        const got: unknown[] = [];
        stream.on('data', (d) => got.push(d));
        res.emitChunk('a');
        res.emitChunk('b');
        expect(got).toEqual(['a', 'b']);
    });

    it('resolve 标记流结束（end 事件，后续 emit 被忽略）', () => {
        const res = new Response(true, true);
        const stream = res.data as ChunkThrough;
        const ends: unknown[] = [];
        stream.on('end', () => ends.push('end'));
        res.resolve(undefined);
        res.emitChunk('late'); // finished 后忽略
        expect(ends).toEqual(['end']);
    });

    it('reject 把错误推入流', () => {
        const res = new Response(true, true);
        const stream = res.data as ChunkThrough;
        const errs: unknown[] = [];
        stream.on('error', (e) => errs.push(e));
        res.reject(new Error('boom'));
        expect(errs).toHaveLength(1);
    });

    it('enableChunkedBuffer=false 时未监听的 chunk 不缓存', () => {
        const res = new Response(true, false);
        const stream = res.data as ChunkThrough;
        res.emitChunk('lost'); // 无监听且不缓冲 → 丢弃
        const got: unknown[] = [];
        stream.on('data', (d) => got.push(d));
        expect(got).toEqual([]);
    });
});
