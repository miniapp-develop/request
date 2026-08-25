import { AbortController, AbortControllerPolyfill, AbortSignal } from '../src/AbortController';

describe('AbortController / AbortSignal', () => {
    it('初始未 abort', () => {
        const ac = new AbortController();
        expect(ac.signal.aborted).toBe(false);
    });

    it('abort 后 aborted=true 且派发监听', () => {
        const ac = new AbortController();
        const calls: boolean[] = [];
        ac.signal.addEventListener('abort', () => calls.push(true));
        ac.abort();
        expect(ac.signal.aborted).toBe(true);
        expect(calls).toEqual([true]);
    });

    it('abort 同步派发，先于 engine 的异步 fail（CANCELLED 胜出）', () => {
        const ac = new AbortController();
        let order: string[] = [];
        ac.signal.addEventListener('abort', () => order.push('abort'));
        Promise.resolve().then(() => order.push('async'));
        ac.abort();
        expect(order).toEqual(['abort']); // 同步派发
        return Promise.resolve().then(() => {
            expect(order).toEqual(['abort', 'async']);
        });
    });

    it('onabort 回调触发', () => {
        const ac = new AbortController();
        let fired = false;
        ac.signal.onabort = () => {
            fired = true;
        };
        ac.abort();
        expect(fired).toBe(true);
    });

    it('多次 abort 只派发一次', () => {
        const ac = new AbortController();
        let count = 0;
        ac.signal.addEventListener('abort', () => count++);
        ac.abort();
        ac.abort();
        expect(count).toBe(1);
    });

    it('removeEventListener 后不再触发', () => {
        const ac = new AbortController();
        let count = 0;
        const fn = () => count++;
        ac.signal.addEventListener('abort', fn);
        ac.signal.removeEventListener('abort', fn);
        ac.abort();
        expect(count).toBe(0);
    });

    it('dispatchEvent 返回 true', () => {
        const s = new AbortSignal();
        expect(s.dispatchEvent({ type: 'abort' })).toBe(true);
    });
});

describe('AbortControllerPolyfill（库自带兜底）', () => {
    it('独立构造可用且 abort 生效', () => {
        const ac = new AbortControllerPolyfill();
        expect(ac.signal).toBeInstanceOf(AbortSignal);
        expect(ac.signal.aborted).toBe(false);
        const calls: boolean[] = [];
        ac.signal.addEventListener('abort', () => calls.push(true));
        ac.abort();
        expect(ac.signal.aborted).toBe(true);
        expect(calls).toEqual([true]);
    });

    it('多次 abort 只派发一次', () => {
        const ac = new AbortControllerPolyfill();
        let count = 0;
        ac.signal.addEventListener('abort', () => count++);
        ac.abort();
        ac.abort();
        expect(count).toBe(1);
    });

    it('removeEventListener 后不再触发', () => {
        const ac = new AbortControllerPolyfill();
        let count = 0;
        const fn = () => count++;
        ac.signal.addEventListener('abort', fn);
        ac.signal.removeEventListener('abort', fn);
        ac.abort();
        expect(count).toBe(0);
    });

    it('onabort 回调触发', () => {
        const ac = new AbortControllerPolyfill();
        let fired = false;
        ac.signal.onabort = () => {
            fired = true;
        };
        ac.abort();
        expect(fired).toBe(true);
    });
});

describe('AbortController 解析顺序', () => {
    const savedAC = (globalThis as { AbortController?: unknown }).AbortController;
    afterEach(() => {
        (globalThis as { AbortController?: unknown }).AbortController = savedAC;
    });

    it('globalThis.AbortController 缺席时回落到库自带 polyfill', () => {
        (globalThis as { AbortController?: unknown }).AbortController = undefined;
        const ac = new AbortController();
        expect(ac.signal).toBeInstanceOf(AbortSignal); // polyfill signal
        ac.abort();
        expect(ac.signal.aborted).toBe(true);
    });

    it('用户全局挂载的 polyfill 优先于库自带', () => {
        let constructed = 0;
        class UserPolyfill {
            signal: { aborted: boolean; onabort: null };
            constructor() {
                constructed++;
                this.signal = { aborted: false, onabort: null };
            }
            abort() {
                this.signal.aborted = true;
            }
        }
        (globalThis as { AbortController?: unknown }).AbortController = UserPolyfill as any;
        const ac = new AbortController();
        expect(constructed).toBe(1);
        expect(ac.signal).not.toBeInstanceOf(AbortSignal); // 用户实现，非库 polyfill
        ac.abort();
        expect(ac.signal.aborted).toBe(true);
    });

    it('每次 new 重新解析：挂载后下一次构造即生效', () => {
        (globalThis as { AbortController?: unknown }).AbortController = undefined;
        const ac1 = new AbortController();
        expect(ac1.signal).toBeInstanceOf(AbortSignal);
        class Another {
            signal = { aborted: false, onabort: null };
            abort() {
                this.signal.aborted = true;
            }
        }
        (globalThis as { AbortController?: unknown }).AbortController = Another as any;
        const ac2 = new AbortController();
        expect(ac2.signal).not.toBeInstanceOf(AbortSignal);
    });
});
