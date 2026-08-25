import { isTransientError } from '../src/strategies';

describe('isTransientError (my / 支付宝)', () => {
    const err = (error: number, errorMessage = 'x') => ({ error, errorMessage });

    it('用户取消 / HTTP 错误为终态', () => {
        // 20 = 取消请求
        expect(isTransientError(err(20, '取消请求'))).toBe(false);
        // 19 = HTTP 状态码 >= 400
        expect(isTransientError(err(19, 'HTTP error'))).toBe(false);
    });

    it('配置类 / 解析类错误为终态', () => {
        // 2 = URL 参数为空
        expect(isTransientError(err(2, 'URL parameter cannot be empty'))).toBe(false);
        // 4 = 域名未授权 / 白名单
        expect(isTransientError(err(4, 'Not authorized to call the interface'))).toBe(false);
        // 14 = 数据解码（JSON 解析）失败
        expect(isTransientError(err(14, 'Decoding failed'))).toBe(false);
    });

    it('网络错误 / 超时为瞬态可重试', () => {
        // 12 = 网络错误
        expect(isTransientError(err(12, 'Network error'))).toBe(true);
        // 13 = 超时
        expect(isTransientError(err(13, 'Timeout'))).toBe(true);
    });

    it('未知码兜底为可重试（宁可重试一次）', () => {
        expect(isTransientError(err(99, '未知错误'))).toBe(true);
        expect(isTransientError(err(1, '其他'))).toBe(true);
    });

    it('null/undefined 兜底为可重试', () => {
        expect(isTransientError(null)).toBe(true);
        expect(isTransientError(undefined)).toBe(true);
        expect(isTransientError({})).toBe(true);
        expect(isTransientError({ error: undefined })).toBe(true);
    });
});
