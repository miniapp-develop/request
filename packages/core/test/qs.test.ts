import { urlStringify } from '../src/qs';

describe('urlStringify', () => {
    it('空 data 原样返回', () => {
        expect(urlStringify('http://x', null)).toBe('http://x');
        expect(urlStringify('http://x', undefined)).toBe('http://x');
        expect(urlStringify('http://x', {})).toBe('http://x');
    });

    it('无 ? 时拼接 ?', () => {
        expect(urlStringify('http://x', { a: 1 })).toBe('http://x?a=1');
    });

    it('以 ? 结尾时直接拼接', () => {
        expect(urlStringify('http://x?', { a: 1 })).toBe('http://x?a=1');
    });

    it('已有 query 时拼接 &', () => {
        expect(urlStringify('http://x?b=2', { a: 1 })).toBe('http://x?b=2&a=1');
    });

    it('多字段 & 编码', () => {
        expect(urlStringify('http://x', { a: 1, b: 'c d' })).toBe('http://x?a=1&b=c%20d');
    });

    it('过滤 null/undefined 字段', () => {
        expect(urlStringify('http://x', { a: 1, b: null, c: undefined })).toBe('http://x?a=1');
    });
});
