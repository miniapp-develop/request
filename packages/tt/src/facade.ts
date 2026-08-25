import { createConvenienceRequest } from '@mini-dev/request';
import type { RequestEngine, RequestInstance } from '@mini-dev/request';
import { createTtEngine } from './engine';

// tt = 抖音小程序全局；本包仅在抖音环境使用，不防御其缺席。
declare const tt: any;

export type { RequestInstance };

/**
 * 创建 tt 便捷请求实例（也是造独立实例 / 注入自定义 engine 的入口）。平台差异仅在此收敛为两个注入点：
 * `getGlobal` 返回 tt 全局、`createEngine` 把它包成核心 `RequestEngine`；
 * 其余用户态 API（Promise + 两段式拦截器、headers/params 归一、库控制走 ext、始终 Promise）
 * 平台无关，由核心 `createConvenienceRequest` 提供。tt 原生用 `header`/`statusCode`（与 wx 一致），tt engine
 * 出向 canonical `headers`→`header`（同 wx）、入向 `res.header`→`Response.headers` /
 * `res.statusCode`→`Response.statusCode`（官方未列 `header`/`cookies`，无则 `undefined`）；不支持 chunked。
 */
export function createRequest(engine?: RequestEngine | null): RequestInstance {
    return createConvenienceRequest(
        {
            getGlobal: () => (typeof tt === 'object' && tt ? tt : null),
            createEngine: createTtEngine,
            nativeHeaderKey: 'header'
        },
        engine
    );
}
