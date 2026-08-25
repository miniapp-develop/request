import { createMyEngine } from './engine';
import { createRequest } from './facade';
import { isTransientError } from './strategies';

// my = 支付宝小程序全局；本包仅在支付宝环境使用，不防御其缺席。
declare const my: any;

export { createMyEngine, createRequest, isTransientError };

/** my 默认便捷单例：旧版 `@mini-dev/request` 的用户态 API（Promise + 两段式拦截器；库控制走 `ext`）。造独立实例 / 注入 engine 用 `createRequest(engine?)`。 */
export const request = createRequest();

// 再导出全部核心能力，消费方只装一个平台包即可拿到全部 API。
// 核心公开面收敛在 @mini-dev/request 的 index，平台包不再手工维护 allow-list（核心新增导出自动透传）。
export * from '@mini-dev/request';
