import { createConvenienceRequest } from '@mini-dev/request';
import type { RequestEngine, RequestInstance } from '@mini-dev/request';
import { createMyEngine } from './engine';

// my = 支付宝小程序全局；本包仅在支付宝环境使用，不防御其缺席。
declare const my: any;

export type { RequestInstance };

/**
 * 创建 my 便捷请求实例（也是造独立实例 / 注入自定义 engine 的入口）。平台差异仅在此收敛为两个注入点：
 * `getGlobal` 返回 my 全局、`createEngine` 把它包成核心 `RequestEngine`；
 * 其余用户态 API（Promise + 两段式拦截器、headers/params 归一、库控制走 ext、始终 Promise）
 * 平台无关，由核心 `createConvenienceRequest` 提供。
 * my 原生即用 `headers`（复数），与核心 canonical `headers` 一致 → my engine 出向 identity（无字段映射）；
 * 入向 my `res.status`→`Response.statusCode`、`res.headers`→`Response.headers`（无 cookies）。便捷层归一把
 * 用户的 `header`/`headers` 统一成 canonical `headers`——支付宝原生是 `headers`（无 `header`），故注入
 * `nativeHeaderKey: 'headers'`：双写时 `headers` 赢（与 wx/tt 的 `header` 赢相反）。
 */
export function createRequest(engine?: RequestEngine | null): RequestInstance {
    return createConvenienceRequest(
        {
            getGlobal: () => (typeof my === 'object' && my ? my : null),
            createEngine: createMyEngine,
            nativeHeaderKey: 'headers'
        },
        engine
    );
}
