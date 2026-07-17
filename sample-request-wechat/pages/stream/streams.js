const { AbortController } = require('@mini-dev/request');
import request from '../../app.request';

const streamRequest = request
    .create()
    .addRequestInterceptor((req) => {
        console.log(`[Page Streams] Interceptor req = `, req);
        return req;
    })
    .addResponseInterceptor((res) => {
        console.log(`[Page Streams] Interceptor res = `, res);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(res);
            }, 1000);
        });
    });

function runRequest(option) {
    return streamRequest(option)
        .then((res) => {
            console.log('[Page Streams]:res=', res);
            res.data.on('data', (chunk) => {
                console.log('[Page Streams]:chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
            });
            res.data.on('end', () => {
                console.log('[Page Streams]:end');
            });
            res.data.on('error', (err) => {
                console.error('[Page Streams]:error', err);
            });
        })
        .catch((err) => {
            console.error('[Page Streams]:err=', err);
        });
}

export function streamWithHeader() {
    runRequest({
        url: 'http://127.0.0.1:3000/stream-with-header',
        timeout: 20000,
        enableChunked: true,
        header: {}
    });
}

export function streamWithoutHeader() {
    runRequest({
        url: 'http://127.0.0.1:3000/stream-without-header',
        timeout: 20000,
        enableChunked: true,
        header: {}
    });
}

export function streamTimeout() {
    runRequest({
        url: 'http://127.0.0.1:3000/stream-timeout',
        timeout: 3000,
        enableChunked: true,
        header: {}
    });
}

export function plainTextWithHeader() {
    runRequest({
        url: 'http://127.0.0.1:3000/plain-with-header',
        timeout: 3000,
        enableChunked: true,
        header: {}
    });
}

export function plainTextWithoutHeader() {
    runRequest({
        url: 'http://127.0.0.1:3000/plain-without-header',
        timeout: 3000,
        enableChunked: true,
        header: {}
    });
}

export function streamThenAbort() {
    const controller = new AbortController();
    setTimeout(() => {
        console.log('[Page Streams]:abort');
        controller.abort();
    }, 1000);
    runRequest({
        url: 'http://127.0.0.1:3000/stream-with-header',
        timeout: 20000,
        signal: controller.signal,
        enableChunked: true,
        header: {}
    });
}

export function streamWithHeaderNoBuffer() {
    runRequest({
        url: 'http://127.0.0.1:3000/stream-with-header',
        timeout: 20000,
        enableChunked: true,
        enableChunkedBuffer: false,
        header: {}
    });
}
