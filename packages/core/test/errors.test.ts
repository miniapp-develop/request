import { RequestError } from '../src/errors';

describe('RequestError', () => {
    it('携带 code / message / raw 字段', () => {
        const e = new RequestError('TIMEOUT', 'request:fail timeout', { errMsg: 'x' });
        expect(e).toBeInstanceOf(RequestError);
        expect(e).toBeInstanceOf(Error);
        expect(e.code).toBe('TIMEOUT');
        expect(e.message).toBe('request:fail timeout');
        expect(e.raw).toEqual({ errMsg: 'x' });
        expect(e.name).toBe('RequestError');
    });

    it('raw 可选', () => {
        const e = new RequestError('CANCELLED', 'x');
        expect(e.raw).toBeUndefined();
    });

    it.each(['TIMEOUT', 'CANCELLED', 'UNSUPPORTED'] as const)('code %s 合法', (code) => {
        const e = new RequestError(code, 'm');
        expect(e.code).toBe(code);
    });
});
