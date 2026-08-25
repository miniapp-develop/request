/**
 * 稳定序列化一个值为字符串：递归按 key 排序，使等价对象（含嵌套对象 / 数组元素中的对象）
 * 产出相同串。用作缓存键，避免 key 顺序差异导致 miss，也避免嵌套对象丢字段导致的碰撞。
 */
export function stableKey(value: unknown): string {
    return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(normalize);
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(value as Record<string, unknown>).sort()) {
            out[k] = normalize((value as Record<string, unknown>)[k]);
        }
        return out;
    }
    return value;
}
