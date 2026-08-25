import type { RequestErrorCode } from './types';

/**
 * 库源错误类型。code 是调用方判断分支的稳定依据。
 *
 * 仅用于库自身动作（超时、取消、方法缺失）；**原生错误不归一、原样透传**。
 * 不携带平台标识——平台即平台库本身，消费方装哪个平台库即知是哪个平台。
 */
export class RequestError extends Error {
    code: RequestErrorCode;
    raw?: unknown;

    constructor(code: RequestErrorCode, message: string, raw?: unknown) {
        super(message);
        this.name = 'RequestError';
        this.code = code;
        this.raw = raw;
    }
}
