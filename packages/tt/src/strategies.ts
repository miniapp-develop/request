/**
 * tt（抖音）原生错误「是否值得重试」判定。retry runner 在错误非 RequestError 时调用它。
 *
 * 抖音 `tt.request` 错误形如 `{ errMsg: 'request:fail ...' }` 文本（与微信同形）：
 * - 用户主动取消（abort/cancel）= 终态，不重试；
 * - 配置类错误（域名未配置 / 体积超限 / 非法 url / ssl 失败）= 终态，不重试；
 * - 其余（网络抖动 / 超时 / 连接重置）= 瞬态，可重试。
 * null/undefined 经 ?. 短路兜底为可重试。
 */
export const isTransientError = (err: unknown): boolean =>
    !/abort|cancel|url\s*not\s*in|domain\s*list|too\s*large|exceed|invalid|ssl/i.test(
        String((err as { errMsg?: string } | null | undefined)?.errMsg ?? '')
    );
