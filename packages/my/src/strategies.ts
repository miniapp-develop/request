/**
 * my（支付宝）原生错误「是否值得重试」判定。retry runner 在错误非 RequestError 时调用它。
 *
 * 支付宝 my.request 错误为数字 `error` 码（`err.error`，已通过官方文档核实）：
 * - 2 = URL 参数为空、4 = 域名未授权 / 白名单、14 = 数据解码（JSON 解析）失败、
 *   19 = HTTP 状态码 >= 400、20 = 取消请求 → 终态不重试；
 * - 12 = 网络错误、13 = 超时 → 瞬态可重试；
 * - 其余未知码兜底为可重试（宁可重试一次，避免把可恢复错误误判为终态）。
 * null/undefined 的 error 经 ?. 短路为 undefined，不在终态集合内 → 兜底为可重试。
 */
const TERMINAL = new Set([2, 4, 14, 19, 20]);

export const isTransientError = (err: unknown): boolean =>
    !TERMINAL.has((err as { error?: number } | null | undefined)?.error as number);
