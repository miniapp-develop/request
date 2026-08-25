import { stableKey } from '../src/util';

describe('stableKey', () => {
    it('基本类型与字符串', () => {
        expect(stableKey('a')).toBe('"a"');
        expect(stableKey(1)).toBe('1');
        expect(stableKey(null)).toBe('null');
        expect(stableKey(undefined)).toBe(undefined);
    });

    it('扁平对象 key 顺序无关', () => {
        expect(stableKey({ b: 2, a: 1 })).toBe(stableKey({ a: 1, b: 2 }));
    });

    it('嵌套对象递归排序 key', () => {
        const a = { method: 'GET', meta: { y: 2, x: 1 } };
        const b = { meta: { x: 1, y: 2 }, method: 'GET' };
        expect(stableKey(a)).toBe(stableKey(b));
    });

    it('嵌套对象不丢字段', () => {
        const a = { config: { foo: 1, bar: 2 } };
        const b = { config: { foo: 1 } };
        expect(stableKey(a)).not.toBe(stableKey(b));
    });

    it('数组按原顺序（不排序），数组内对象递归排序', () => {
        const a = { items: [{ b: 2, a: 1 }, { d: 4, c: 3 }] };
        const b = { items: [{ a: 1, b: 2 }, { c: 3, d: 4 }] };
        expect(stableKey(a)).toBe(stableKey(b));
        const c = { items: [{ d: 4, c: 3 }, { a: 1, b: 2 }] };
        expect(stableKey(a)).not.toBe(stableKey(c));
    });
});
