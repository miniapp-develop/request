// @mini-dev/request 微信示例 - chunked 流式（wx 专有能力）
//
// wx engine 把原生 onHeadersReceived/onChunkReceived 映射成核心 Response 的流式接口：
// 首帧 headers 即 resolve 出 Response（data 为 ChunkThrough 流），chunks 经 data 事件透传，success 收尾 end。
// enableChunkedBuffer（默认 true）缓存到达但未监听的 chunk；设 false 可观察「未缓冲时监听前的 chunk 丢失」。
// my/tt 原生无分块事件，不支持 chunked——见 alipay/douyin 示例。
const { AbortController, createRequest } = require('@mini-dev/request-wx');
const formatError = require('../../utils/formatError');

const BASE = 'http://127.0.0.1:8008';

// 复用单个 decoder，避免每个 chunk 都 new 一个 TextDecoder。
const decoder = new TextDecoder('utf-8');

const streamRequest = createRequest();

// runRequest(option, log)：log 把状态/chunk 同步落到 UI 结果区。
function runRequest(option, log) {
    log(`请求中：${option.url.replace(BASE, '')}（buffer=${option.enableChunkedBuffer !== false}）`);
    return streamRequest(option)
        .then((res) => {
            const chunks = [];
            res.data.on('data', (chunk) => {
                const text = decoder.decode(chunk);
                chunks.push(text);
                console.log('[Streams] chunk', chunk, text);
                log(`chunk: ${text}`);
            });
            res.data.on('end', () => {
                console.log('[Streams] end');
                log(`end（共 ${chunks.length} 个 chunk）`);
            });
            res.data.on('error', (err) => {
                console.error('[Streams] error', err);
                log(`stream error: ${formatError(err)}`);
            });
        })
        .catch((err) => {
            console.error('[Streams] err', err);
            log(`失败: ${formatError(err)}`);
        });
}

// 各端点公共配置：enableChunked + ext.timeout。
function stream(option, log) {
    return runRequest({ enableChunked: true, ...option }, log);
}

export function streamWithHeader(log) {
    return stream({ url: `${BASE}/stream-with-header`, ext: { timeout: 20000 } }, log);
}

export function streamWithoutHeader(log) {
    return stream({ url: `${BASE}/stream-without-header`, ext: { timeout: 20000 } }, log);
}

export function streamTimeout(log) {
    return stream({ url: `${BASE}/stream-timeout`, ext: { timeout: 3000 } }, log);
}

export function plainTextWithHeader(log) {
    return stream({ url: `${BASE}/plain-with-header`, ext: { timeout: 3000 } }, log);
}

export function plainTextWithoutHeader(log) {
    return stream({ url: `${BASE}/plain-without-header`, ext: { timeout: 3000 } }, log);
}

// 用 /stream-hang-up（持续推送永不结束）演示中途 abort：1s 后 abort 必然打断在途流。
export function streamThenAbort(log) {
    const controller = new AbortController();
    setTimeout(() => {
        console.log('[Streams] abort');
        controller.abort();
    }, 1000);
    return stream({ url: `${BASE}/stream-hang-up`, ext: { timeout: 20000, signal: controller.signal } }, log);
}

export function streamWithHeaderNoBuffer(log) {
    return stream({ url: `${BASE}/stream-with-header`, ext: { timeout: 20000 }, enableChunkedBuffer: false }, log);
}
