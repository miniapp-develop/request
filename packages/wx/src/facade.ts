import { createConvenienceRequest } from '@mini-dev/request';
import type { RequestEngine, RequestInstance } from '@mini-dev/request';
import { createWxEngine } from './engine';

// wx = 微信小程序全局；本包仅在微信环境使用，不防御其缺席。
declare const wx: any;

export type { RequestInstance };

/**
 * 创建 wx 便捷请求实例（也是造独立实例 / 注入自定义 engine 的入口）。平台差异仅在此收敛为两个注入点：
 * `getGlobal` 返回 wx 全局、`createEngine` 把它包成核心 `RequestEngine`；
 * 其余用户态 API（Promise + 两段式拦截器、headers/params 归一、库控制走 ext、始终 Promise）
 * 平台无关，由核心 `createConvenienceRequest` 提供。wx 原生用 `header`（单数），wx engine 出向
 * canonical `headers`→`header`、入向 `res.header`→`Response.headers` / `res.statusCode`→`Response.statusCode` /
 * `res.cookies`→`Response.cookies`；**唯一支持 chunked 流式**（`onHeadersReceived`/`onChunkReceived`）。
 */
export function createRequest(engine?: RequestEngine | null): RequestInstance {
    return createConvenienceRequest(
        {
            getGlobal: () => (typeof wx === 'object' && wx ? wx : null),
            createEngine: createWxEngine,
            nativeHeaderKey: 'header'
        },
        engine
    );
}
