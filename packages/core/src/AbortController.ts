/**
 * 取消信号的构造与解析。
 *
 * 小程序运行时（wx/my/tt）没有标准 `AbortController`/`AbortSignal` 全局。本模块按以下顺序解析
 * `new AbortController()` 背后的构造器：
 *   1. `globalThis.AbortController` —— 系统原生（未来平台上线时自动生效），或用户全局挂载的 polyfill；
 *   2. 库自带 `AbortControllerPolyfill` —— 兜底。
 *
 * 用户想用自己的 polyfill：在调用前 `globalThis.AbortController = YourAC` 即可（全局污染，与标准
 * polyfill 的安装惯例一致）；也可直接 `new AbortControllerPolyfill()` 用库自带的。每次 `new` 都重新
 * 解析，故用户任意时机挂载 `globalThis.AbortController` 都会在下一次构造生效。
 *
 * signal 保持通用——**不认识**原生 `RequestTask`；真正取消由平台 engine 订阅 `abort` 事件后
 * 调 `task.abort()` 完成。取消中间件（`middleware/abort.ts`）与 engine 对 signal 来源无关：
 * 本库 polyfill、Node/未来平台原生 AbortSignal 都能工作（只用 `aborted`/`addEventListener`/
 * `removeEventListener`）。
 */

/** 最小 AbortSignal 实现（标准接口形态）。 */
export class AbortSignal {
    aborted = false;
    onabort: (() => void) | null = null;
    private listeners: Array<() => void> = [];

    addEventListener(_type: string, listener: () => void): void {
        this.listeners.push(listener);
    }

    removeEventListener(_type: string, listener: () => void): void {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    dispatchEvent(event: { type: string }): boolean {
        if (this.aborted) return true;
        this.aborted = true;
        const ls = this.listeners;
        this.listeners = [];
        for (const l of ls) l();
        if (this.onabort) this.onabort();
        return true;
    }
}

/** 库自带的 AbortController 兜底实现。 */
export class AbortControllerPolyfill {
    signal: AbortSignal;
    constructor() {
        this.signal = new AbortSignal();
    }
    abort(): void {
        this.signal.dispatchEvent({ type: 'abort' });
    }
}

/** 解析当前可用的 AbortController 构造器：全局（系统/用户）优先，否则库自带兜底。 */
function resolveAbortController(): new () => { signal: any; abort(): void } {
    if (typeof globalThis !== 'undefined' && (globalThis as { AbortController?: unknown }).AbortController) {
        return (globalThis as { AbortController: any }).AbortController;
    }
    return AbortControllerPolyfill;
}

/**
 * 导出的 AbortController：每次 `new` 重新解析构造器并委托。
 * 命中 `globalThis.AbortController` 时用之（系统原生或用户 polyfill），否则用库自带兜底。
 */
export class AbortController {
    signal: any;
    private _impl: { signal: any; abort(): void };

    constructor() {
        this._impl = new (resolveAbortController())();
        this.signal = this._impl.signal;
    }

    abort(): void {
        this._impl.abort();
    }
}
