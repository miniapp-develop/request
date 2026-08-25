/**
 * 公共类型定义。本文件只含类型，无运行时代码。
 *
 * 核心：平台无关。不持有平台标签——平台即平台库本身（@mini-dev/request-wx 等），
 * 核心不在运行时携带任何平台标识。
 */

import type { Response } from './Response';

/** 库源错误码（仅库自身动作）。原生错误不归一、原样透传。 */
export type RequestErrorCode = 'TIMEOUT' | 'CANCELLED' | 'UNSUPPORTED';

/**
 * 取消信号的最小接口形态。库导出的 polyfill `AbortSignal` 与运行时原生 `AbortSignal` 都满足它，
 * abort 中间件 / 平台 engine 只用这三个成员。核心不依赖 `reason`/`throwIfAborted` 等 DOM 扩展。
 */
export interface AbortSignalLike {
    aborted: boolean;
    addEventListener(type: 'abort', listener: () => void): void;
    removeEventListener(type: 'abort', listener: () => void): void;
}

/**
 * 库控制，装在调用选项的保留字段 `ext` 里，与原生参数命名空间隔离。
 * 原生参数直接平铺在调用选项顶层，库只剥掉 `ext` 与 `success`/`fail`/`complete`，
 * 其余原样透传——这样未来原生新增参数也不会与库控制撞名。
 */
export interface ExtControls {
    /** 超时（ms），>0 启用 Promise.race 计时。 */
    timeout?: number;
    /** 缓存有效期（ms），>0 启用缓存。 */
    maxAge?: number;
    /** 仅对瞬态错误的重试次数。 */
    retry?: number;
    /** 取消信号，触发即抛 CANCELLED。 */
    signal?: AbortSignalLike;
    /** 单次追加拦截器。 */
    interceptors?: Interceptor[];
}

/** 调用选项 = 原生参数平铺 + 保留字段 ext + 原生回调 success/fail/complete。 */
export type RequestOptions = Record<string, unknown> & { ext?: ExtControls };

/**
 * Canonical 请求：core 拥有、平台无关的请求契约。由调用选项剥掉 `ext`/`success`/`fail`/`complete`
 * 后得到，喂给平台 engine。engine 负责把它映射到本平台原生 `request` 的入参（canonical↔native），
 * 核心不假定它等于任一平台的原生字段名。
 *
 * 字段命名对齐 web 标准（`headers` 复数），与响应侧 `Response.headers` 自洽；
 * 平台特有原生字段（如 wx 的 `dataType`/`responseType`）经索引签名 passthrough，
 * 由各 engine 原样转发（平台不识别则忽略）。
 */
export interface CanonicalRequest {
    url?: string;
    /** 请求方法，原样不大写化、不缺省（由原生默认，三平台均默认 GET）。 */
    method?: string;
    /** 请求体（非 GET）或 GET 查询参数（三平台原生均用 `data`，已是中性）。 */
    data?: unknown;
    /** 请求头，复数——与 `Response.headers` 一致、对齐 web 标准。 */
    headers?: Record<string, unknown>;
    /** 开启 chunked 流式（仅 wx 原生支持；my/tt 忽略）。 */
    enableChunked?: boolean;
    /** 缓存已到达但未监听的 chunk，默认 true（仅 chunked 有效）。 */
    enableChunkedBuffer?: boolean;
    /** 平台特有原生字段 passthrough（`dataType`/`responseType` 等），engine 原样转发。 */
    [key: string]: unknown;
}

/** 贯穿中间件的上下文。 */
export interface RequestContext {
    method: string;
    /** 调用者传入的完整入参（含 ext、回调、原生参数）。 */
    options: RequestOptions;
    /** 剥掉 ext/success/fail/complete 后的 canonical 请求，原样喂给 engine。 */
    canonical: CanonicalRequest;
    /** 库控制。 */
    ext: ExtControls;
    engine: RequestEngine;
    /** 原生响应（一个 Response）原样存放。 */
    result?: unknown;
    /** 中间件之间自由传值的口袋。 */
    state: Record<string, unknown>;
}

/** 洋葱中间件签名（koa-compose 风格）。 */
export interface Interceptor {
    (ctx: RequestContext, next: () => Promise<void>): Promise<void>;
}

/**
 * 平台引擎：由各平台库构造并注入核心。核心不构造 engine、不碰 globalThis、
 * 不持有 per-platform 策略。`request` 收到 core 的 canonical 请求，负责把它映射到本平台
 * 原生 `request` 的入参并返回一个 core 的 `Response`（native 响应字段→canonical）；
 * `signal` 供 engine 绑定原生 `RequestTask.abort()` 实现真正取消（signal 本身保持通用、不认识 task）。
 */
export interface RequestEngine {
    request(args: CanonicalRequest, signal?: AbortSignalLike): Response | Promise<Response>;
    /** 判定一个原生错误是否值得重试。由平台库构造 engine 时注入。 */
    isTransientError?(err: unknown): boolean;
}
