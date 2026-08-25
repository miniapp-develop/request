# AGENTS.md

This file provides guidance to Code Agent (claude.ai/code) when working with code in this repository.

## What this is

`@mini-dev/request` —— 跨微信 / 支付宝 / 抖音小程序 HTTP 请求库（TS）。范式与同仓 `@mini-dev/location` 一致：**平台无关 core**（`koa-compose` 洋葱中间件 + `ctx` + `ext` 命名空间 + `RequestError` + retry 外层）+ **平台包**（wx/my/tt engine + 各自瞬态错误策略 + 便捷单例）。

两条 API 路径并存：

- **augment-only（核心 `createMethod`）**：原生入参 / 响应 / 错误原样透传，库控制走 `ext`，不归一。供需要纯净透传的消费方。
- **便捷层（平台包默认单例）**：在 `createMethod` 之外叠一层旧版 `@mini-dev/request` 用户态 API——`headers`/`params` 归一、两段式拦截器（`addRequestInterceptor`/`addResponseInterceptor`）、Promise 返回；库控制统一走 `ext`（与核心层一致），`method` 不缺省，回调丢弃。造独立实例 / 注入 engine 用平台包导出的 `createRequest(engine?)`。供大多数业务直接用。

`koa-compose`（普通依赖，不内联打包）提供洋葱中间件。设计说明见 `README.md` §设计。

本仓库是 **pnpm workspace monorepo**，发布包：

- `packages/core` —— `@mini-dev/request`：平台无关核心引擎（`createMethod` / 中间件 `abort`·`cache`·`timeout`·`retry` / `RequestError` / `Response` / `ChunkThrough` / `AbortController`·`AbortControllerPolyfill`·`AbortSignal` / `normalizeRequestOptions` 便捷归一）。不碰 `globalThis`。
- `packages/wx` —— `@mini-dev/request-wx`：wx 引擎（`createWxEngine` 把 `wx.request`+`RequestTask` 包成 `RequestEngine`）+ wx 瞬态策略 + 默认便捷单例 + 再导出核心。**唯一支持 chunked 流式**（`onHeadersReceived`/`onChunkReceived`）。
- `packages/my` —— `@mini-dev/request-my`：my 引擎（`createMyEngine` 把 `my.request` 包成 `RequestEngine`，native 用 `headers`/`status` 字段，与 canonical `headers` 一致 → 出向 identity（无字段映射），入向 `res.status`→`statusCode`、`res.headers`→`headers`（无 cookies））+ my 瞬态策略（`err.error` 数值码：2/4/14/19/20 终态，其余重试）+ 默认便捷单例 + 再导出核心。不支持 chunked（`enableChunked` 被忽略，原样透传）。
- `packages/tt` —— `@mini-dev/request-tt`：tt 引擎（`createTtEngine` 把 `tt.request` 包成 `RequestEngine`，native 用 `header`/`statusCode`，engine 出向 canonical `headers`→`header`（同 wx）、入向 `res.header`→`headers`、`res.statusCode`→`statusCode`）+ tt 瞬态策略（`errMsg` 文本，与 wx 同形）+ 默认便捷单例 + 再导出核心。success 回调官方未列 `header`/`cookies`，engine 仍读取之（平台实际返回则填入，否则 `undefined`）；不支持 chunked（`enableChunked` 被忽略，原样透传）。

**为什么拆**：部分小程序「构建 npm」不解析 `exports` 子路径，`require('@mini-dev/request/wx')` 在这些平台失败。拆成独立单入口包（仅 `main`）后任何「构建 npm」都能解析；消费方只装一个平台包，核心经平台包 `dependencies` 传递引入。与 `@mini-dev/location` 同款理由。

## Commands

- **测试：** `pnpm test` = 拓扑序构建后各包 `jest --coverage`。每包核心 100% 覆盖（statements/branches/functions/lines），覆盖率阈值卡死 100，低于则失败。平台包测试依赖核心已构建（`pnpm test` 会先 `pnpm -r build`）。
- **类型检查：** `pnpm run typecheck`（先 `pnpm --filter @mini-dev/request run build` 产出核心 dist，再各包 `tsc --noEmit`）。平台包 tsconfig 无 `paths`，`@mini-dev/request` 经 node_modules 软链解析到核心**已构建的 dist 类型**——故必须先构建核心。
- **构建：** `pnpm run build`（`pnpm -r --filter './packages/**' run build`，按拓扑序先核心后平台包；每包 `rimraf dist && tsdown` → `dist/cjs` + `dist/esm`，双格式 + per-format `.d.ts`，显式 `target: es2015`）。配置见各包 `tsdown.config.ts`；小程序「构建 npm」落点为各包 `package.json` 的 `miniprogram: "dist/cjs"`。
- **单测单个文件：** 在某包目录下 `npx jest test/method.test.ts`（平台包需先 `pnpm --filter @mini-dev/request build` 产出核心 dist）。
- **冒烟：** `pnpm verify-samples`（先 build，再用 mock 平台全局把 wechat/alipay/douyin 三套示例各驱动一遍真实构建产物：success/fail 透传、abort 真取消、wx chunked 流、拦截器顺序、AbortController 解析三档）。

## Architecture

方法级、不归一、不探测（见 README §设计）：

```
平台包便捷单例 request(option) ── 旧版用户态 API（headers/params 归一 + 两段式拦截器）；库控制统一走 ext（与核心层一致）
   │  mapToCore: normalizeRequestOptions 归一(header/headers→canonical headers / params) → `ext` 透传 → canonical 平铺（顶层其余字段原样透传，不假设原生参数）
   └─► 核心 createMethod('request', { engine: () => Engine }) ── 增强方法（闭包：懒调 engine 工厂 + 方法独享缓存 + retryDelay）
          └─ 单次调用：compose([abort?, cache?, timeout?, ...方法interceptors, ...ext.interceptors, core])
                          └─ runWithRetry 包裹整条链（在 compose 外层）
   core ─► Engine.request(canonical, signal) ─► engine 把 canonical↔native 映射 ─► wx/my/tt 原生 request + RequestTask
        纯透传：canonical 入参原样进 engine、原生响应包成 core Response 出、原生错误原样 reject；
        signal 由 engine 订阅调 task.abort() 真正中断在途请求
        canonical↔native 由 engine 显式映射：出向 wx/tt canonical `headers`→原生 `header`、my canonical `headers`=原生 `headers`（identity）；入向 wx/tt `res.header`→`Response.headers`/`res.statusCode`→`Response.statusCode`/`res.cookies`→`Response.cookies`，my `res.status`→`Response.statusCode`/`res.headers`→`Response.headers`（无 cookies）
        chunked 仅 wx：my/tt 无 `onChunkReceived`，`enableChunked` 被忽略，整段响应体在 success 一次性 resolve
```

- **canonical 请求 / 响应（核心拥有、平台无关；engine 负责与 native 互转）**：核心定义 `CanonicalRequest`（`url`/`method`/`data`/`headers` 复数 /`enableChunked`/`enableChunkedBuffer` + 平台特有字段 `[key: string]: unknown` passthrough）与 `Response`（`data`/`headers`/`statusCode`/`cookies`/`enableChunked`）。**`headers` 复数对齐 web 标准、与 `Response.headers` 自洽——核心不假定 canonical 等于任一平台原生字段名，不隐式默认 wx。** 各 engine 显式做 canonical↔native：出向 wx/tt `headers`→原生 `header`、my `headers`=原生 `headers`（identity）；入向 wx/tt `res.header`/`res.statusCode`/`res.cookies`→`Response.headers`/`statusCode`/`cookies`，my `res.status`/`res.headers`→`Response.statusCode`/`headers`（无 cookies）。便捷层归一即把用户 `header`/`headers`→canonical `headers`（双写时由平台原生字段决定优先：wx/tt 原生 `header` 故 `header` 优先、my 原生 `headers` 故 `headers` 优先，经 facade 注入的 `nativeHeaderKey` 传入 `normalizeRequestOptions`，缺省 `'headers'` 平台中立）、`params`→`data`(GET)/`url`(非GET)；`method` 不缺省（交原生默认，三平台均 `GET`）。augment-only 不归一，消费方直接用 canonical 字段名（如 `headers` 而非 wx `header`），engine 再转。
- **`createMethod`（`packages/core/src/method.ts`）**：把一个原生方法包成可调用函数。入参 `{ engine: () => Engine, interceptors?, cacheSize?, retryDelay? }`——`engine` 是工厂，首次调用懒调（保留「import 不抛」语义），工厂由平台包提供，核心不碰 `globalThis`。按调用构建链；`ext` 字段激活内置拦截器；retry 在外层包裹；回调模式（`success`/`fail`/`complete`）返回 `undefined`，否则返回 `Promise<Response>`。engine 工厂抛错时调用 reject 该错误，且 engine 未缓存、下次调用重试工厂。
- **调用形态**：单对象 = canonical 参数平铺 + 保留字段 `ext`（`timeout`/`maxAge`/`retry`/`signal`/`interceptors`）。`core` 只剥固定键 `{ext, success, fail, complete}`，其余（含误写在顶层的库控制名）原样作为 canonical 给 engine。**库控制应放 `ext`**——写在顶层会原样透传给原生而不激活（且与未来原生新增字段有撞名风险，location 旧版 `type` 冲突 bug 的教训）；`timeout` 是唯一重名者，顶层 `timeout` 为原生超时透传、`ext.timeout` 为库级，二者不并用。
- **`core`**（`method.ts` 内）调 `engine.request(canonical, signal)`——engine 负责 canonical→native 请求与 native→`Response` 构造；结果（`Response`）写 `ctx.result`，失败 `throw` 原生 err。方法在 engine 上不存在时抛 `UNSUPPORTED`，**不静默降级**。
- **重试不是 koa 中间件**，而是 `runWithRetry` 外层 runner：koa-compose 的 `next()` 只能调用一次，无法在链内循环重试。`err instanceof RequestError` → 终态不重试；否则按 `engine.isTransientError(err)` 判定瞬态。
- **链路顺序**：`abort → cache → timeout → 方法默认 interceptors → ext.interceptors → core`，retry 在最外层包裹。内置拦截器按 `ext` 激活：`ext.maxAge>0` 才缓存、`ext.timeout>0` 才计时、`ext.retry>0` 才重试、`ext.signal` 才取消；全省略 = 纯透传。
- **便捷层 `createRequest`（`packages/{wx,my,tt}/src/facade.ts`）**：旧版 `@mini-dev/request` 的用户态 API。`mapToCore` 先 `normalizeRequestOptions` 归一（`header`/`headers`→canonical `headers`（复数，双写时按平台原生字段 `nativeHeaderKey` 优先：wx/tt=`header`、my=`headers`，缺省 `'headers'`）、`params`→`data`(GET)/`url`(非GET)；`method` 不缺省，交原生默认），再剥掉回调 `success`/`fail`/`complete` 与 `header` 别名（便捷层 Promise-only，canonical 只留 `headers`），`ext` 原样透传（消费方在此放库控制），其余（`url`/`data`/`headers`/`timeout`/`retry`/`maxAge`/`signal`/`interceptors`/`enableChunked`…）原样作为 canonical 透传给 engine——库不假设原生参数，库级控制只认 `ext`。两段式拦截器按「后注册者在外层」对称嵌套：request 拦截器 `unshift`（后注册的先跑）、response 拦截器 `push`（先注册的先跑）——成对注册 A、B 的执行序为 `reqB→reqA→[核心链]→resA→resB`，后注册者作为外层（洋葱式后进先出）。造独立实例 / 注入 engine 用平台包导出的 `createRequest(engine?)`（不在实例上派生）。
- **取消（abort）**：`abort` 中间件只认标准 `AbortSignal` 接口（`addEventListener`/`aborted`），signal 已 abort 或请求中 abort → 抛 `RequestError('CANCELLED')`。**真正中断在途请求由 engine 做**：engine 持有 `RequestTask`，订阅 `signal` 的 abort 事件后调 `task.abort()`——signal 保持通用、不认识 task（与旧版 `signal._attachTask_(task)` 的职责泄漏相反）。运行时无标准 `AbortController`，故库自带一份轻量 `AbortController`/`AbortSignal`（标准接口形态：`aborted`/`onabort`/`addEventListener`/`removeEventListener`/`dispatchEvent`）；**`new AbortController()` 按 `globalThis.AbortController`（系统原生 / 用户全局挂载的 polyfill）→ 库自带 `AbortControllerPolyfill` 兜底顺序解析，每次 `new` 重新解析**（用户随时 `globalThis.AbortController = YourAC` 即生效；兜底实现亦单独导出为 `AbortControllerPolyfill` 供测试/固定行为）。取消中间件对 signal 来源无关——自带 polyfill、Node / 未来平台原生 `AbortSignal` 都能工作（只用上述标准方法）。
- **chunked**：**仅 wx 支持**。wx engine 把平台特有的 `onHeadersReceived`/`onChunkReceived` 映射成核心 `Response` 的规范方法（`setHeaders`/`emitChunk`/`resolve`/`reject`）：首帧 headers 即 resolve 出 `Response`（其 `data` 为 `ChunkThrough` 流），传输完毕 `success` 标记流 end；`enableChunkedBuffer`（默认 true）缓存到达但未监听的 chunk，对齐旧版。my/tt 原生无分块事件，engine 不构造 chunked `Response`——`enableChunked` 被忽略、原样透传给原生（原生不识别亦忽略），响应体在 `success` 一次性 `resolve(res.data)`（非流）。消费方按平台能力选用，勿在 my/tt 期待流式。
- **错误模型**：`RequestError`（`code`: `TIMEOUT`/`CANCELLED`/`UNSUPPORTED`）仅用于库自身动作；**原生错误不归一、原样透传**（形如 `{ errMsg }` 的普通对象）。不携带平台标识——平台即平台包本身。
- **平台包**：唯一知道平台的地方。`createWxEngine`/`createMyEngine`/`createTtEngine` 直接引用本平台全局（`wx`/`my`/`tt`）、吸收本平台字段差异（见上）、注入本平台 `isTransientError`（`packages/{wx,my,tt}/src/strategies.ts`）；导出默认便捷单例 + `createRequest`/`createXxxEngine`/`isTransientError` + 再导出核心 `createMethod`/`RequestError`/`Response`/`ChunkThrough`/`AbortController`/`AbortControllerPolyfill`/`AbortSignal`/`normalizeRequestOptions` + 类型。**无 `detect.ts`**——不探测，平台由消费方选平台包；分平台包后「运行时不存在」不设防，平台全局缺席属 misuse。

## Conventions

- 公开 API 收敛：核心 `packages/core/src/index.ts` 导出 `createMethod` / `RequestError` / `Response` / `ChunkThrough` / `AbortController` / `AbortControllerPolyfill` / `AbortSignal` / `normalizeRequestOptions` / `permission`(无) + 公开类型。**不导出** `RequestCache`/`compose`/内部中间件工厂。平台包导出便捷单例 + `createRequest`/`createXxxEngine`（wx/my/tt）/`isTransientError` + 再导出核心。内部实现（`RequestCache` 等）不公开，测试直接从 `packages/core/src/...` 路径导入。
- 改公开 API 不需考虑向后兼容（v1）；但 `packages/core/test/index.test.ts` 里有"不导出内部细节"的断言，收敛后要同步。各平台包 `test/index.test.ts` 同样有导出面断言。
- 4 空格缩进、单引号、分号。无 prettier 依赖。
- 加新中间件：放 `packages/core/src/middleware/`，在 `method.ts` 的链路数组按位置挂入；写对应 `packages/core/test/<name>.test.ts` 并保持 100% 覆盖。
- 改 per-platform 重试判定：改对应 `packages/{wx,my,tt}/src/strategies.ts`，同步该包 `test/strategies.test.ts`。
- 加新平台包：新建 `packages/<plat>/`（`src/index.ts` + `src/engine.ts` + `src/strategies.ts` + `src/facade.ts` + `package.json`/`tsconfig.json`/`tsdown.config.ts`/`jest.config.js` + `test/`），在 `pnpm-workspace.yaml` 的 `packages/*` 通配下自动纳入；按平台能力决定 `enableChunked` 是否支持、`RequestTask` 事件名差异如何映射。同步根 `tsconfig.json` paths（如需）+ 新增对应 sample + 在 `scripts/verify-samples.cjs` 的 `SAMPLES` 注册。
- 示例 `sample-request-*` 的 `package.json` 必须直接依赖**三件**：对应平台包（`workspace:*`）+ `@mini-dev/request`（`workspace:*`）+ `koa-compose`（`catalog:`）。原因：微信「构建 npm」只处理示例顶层 `node_modules` 里的包，不钻进 pnpm 嵌套 `node_modules` 找传递依赖；缺任何一个都不会被构建进 `miniprogram_npm`，运行时 `require` 回退相对路径而失败。`pnpm verify-samples` 里的 `checkSampleDeps` 是这条约定的防回归 guard。真实消费方（非 monorepo）用 npm 装平台包时，核心与 `koa-compose` 会自动平铺到顶层，无需手动加。
- 跨包类型解析：**根 `tsconfig.json`** 用 `paths` 把 `@mini-dev/request` 映射到 `packages/core/src`（IDE 跨包导航用，不参与脚本化构建）。各包 `tsconfig.json` **无 `paths`**，`tsc`/tsdown/jest 一律经 node_modules 软链解析到核心**已构建的 dist**——故 `pnpm test`/`typecheck`/平台包 build 需先构建核心，拓扑序由 pnpm `-r` 保证。
- `workspace:*` 协议在发布时由 pnpm 改写为实际版本；各包 tsdown cjs pass 的 `onSuccess`（`scripts/build-deps.cjs` 的 `resolveDeps`）把 `workspace:*` 解析为已安装实际版本的 caret 区间写入 `dist/cjs/package.json`，让小程序「构建 npm」运行时跨包 require 可用。
- **engine abort 脚手架刻意不抽**：三平台 `engine.ts` 有一段 ~22 行的 abort 脚手架逐字重复（预短路 `signal.aborted` → `settled`/`onAbort`/`clean` 状态 → `task = vendorRequest(...)` → `signal.addEventListener('abort', () => task.abort())`）。**这是有意保留的重复，不要当 dup 抽到 core**。理由：(1) 这段是 abort 竞态的承重墙——`task` 必须在 `addEventListener` 之前拿到、`reject` 的「已 settled 则仅 clean」语义、wx chunked 在 `success` 收尾时需单独 `clean()` 而非 settle，任一抽取偏差都会改变取消语义；(2) 抽取需引入带条件清理语义的 4 方法 `Settle` 接口（`resolve`/`reject`/`clean`/`isSettled`），非机械 dedup；(3) 现状每个 engine 自包含，改 abort bug 单文件可读，locality 对「取消正确性至上」的库有价值。若将来加第 4 个平台或第 4 个共享关注点，再考虑抽取——届时以各包 `engine.test.ts` 的 abort 竞态用例为安全网。
