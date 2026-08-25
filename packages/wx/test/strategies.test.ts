import { isTransientError } from '../src/strategies';

describe('isTransientError (wx)', () => {
    const err = (errMsg: string) => ({ errMsg });

    it('用户取消类为终态', () => {
        expect(isTransientError(err('request:fail abort'))).toBe(false);
        expect(isTransientError(err('request:fail cancel'))).toBe(false);
    });

    it('配置类错误为终态', () => {
        expect(isTransientError(err('url not in domain list'))).toBe(false);
        expect(isTransientError(err('request:fail domain list not configured'))).toBe(false);
        expect(isTransientError(err('request:fail too large'))).toBe(false);
        expect(isTransientError(err('request:fail exceed max size'))).toBe(false);
        expect(isTransientError(err('request:fail invalid url'))).toBe(false);
        expect(isTransientError(err('request:fail ssl hand shake fail'))).toBe(false);
    });

    it('网络抖动 / 超时为瞬态可重试', () => {
        expect(isTransientError(err('request:fail timeout'))).toBe(true);
        expect(isTransientError(err('request:fail'))).toBe(true);
        expect(isTransientError(err('request:fail network'))).toBe(true);
    });

    it('null/undefined 兜底为可重试', () => {
        expect(isTransientError(null)).toBe(true);
        expect(isTransientError(undefined)).toBe(true);
        expect(isTransientError({})).toBe(true);
    });
});
