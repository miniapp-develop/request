import { ChunkThrough } from '../src/ChunkThrough';

describe('ChunkThrough', () => {
    it('默认开启 buffer：先 emit 后 on，监听时回放缓存', () => {
        const t = new ChunkThrough();
        const got: unknown[] = [];
        t.emit('data', 1);
        t.emit('data', 2);
        t.on('data', (d) => got.push(d));
        expect(got).toEqual([1, 2]);
    });

    it('先 on 后 emit：直接派发', () => {
        const t = new ChunkThrough();
        const got: unknown[] = [];
        t.on('data', (d) => got.push(d));
        t.emit('data', 3);
        expect(got).toEqual([3]);
    });

    it('多个 handler 都收到', () => {
        const t = new ChunkThrough();
        const a: unknown[] = [];
        const b: unknown[] = [];
        t.on('data', (d) => a.push(d));
        t.on('data', (d) => b.push(d));
        t.emit('data', 9);
        expect(a).toEqual([9]);
        expect(b).toEqual([9]);
    });

    it('end 后 emit 不再派发', () => {
        const t = new ChunkThrough();
        const got: unknown[] = [];
        t.on('data', (d) => got.push(d));
        t.emit('data', 1);
        t.end();
        t.emit('data', 2);
        expect(got).toEqual([1]);
    });

    it('end 触发 end 事件', () => {
        const t = new ChunkThrough();
        const ends: unknown[] = [];
        t.on('end', () => ends.push(true));
        t.end();
        expect(ends).toEqual([true]);
    });

    it('error 触发 error 事件并标记结束', () => {
        const t = new ChunkThrough();
        const errs: unknown[] = [];
        t.on('error', (e) => errs.push(e));
        t.error(new Error('boom'));
        t.emit('data', 1); // 已结束，忽略
        expect(errs.length).toBe(1);
    });

    it('关闭 buffer：先 emit 后 on 不回放', () => {
        const t = new ChunkThrough({ enableBuffer: false });
        const got: unknown[] = [];
        t.emit('data', 1);
        t.on('data', (d) => got.push(d));
        t.emit('data', 2);
        expect(got).toEqual([2]);
    });

    it('buffer 被首个 on 消费后，后续 on 不再回放（buffer 已删除）', () => {
        const t = new ChunkThrough();
        t.emit('data', 1);
        const first: unknown[] = [];
        t.on('data', (d) => first.push(d)); // 消费 buffer，buffers['data'] 删除
        const second: unknown[] = [];
        t.on('data', (d) => second.push(d)); // events['data'] 已存在，跳过 buffer 分支
        expect(first).toEqual([1]);
        expect(second).toEqual([]);
        t.emit('data', 2);
        expect(first).toEqual([1, 2]);
        expect(second).toEqual([2]);
    });
});
