function runRequest(request, option) {
    return request(option).then((res) => {
        console.log('[Page Streams]:res=', res);
        res.data.on('data', (chunk) => {
            console.log('[Page Streams]:chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
        });
        res.data.on('end', () => {
            console.log('[Page Streams]:end');
        });
        res.data.on('error', err => {
            console.error('[Page Streams]:error', err);
        });
    }).catch((err) => {
        console.error('[Page Streams]:err=', err);
    });
}

export function plainTextWithHeader(request) {
    runRequest(request, {
        url: 'http://127.0.0.1:3000/plain-with-header',
        timeout: 3000,
        enableChunked: true,
        header: {}
    });
}

export function plainTextWithoutHeader(request) {
    runRequest(request, {
        url: 'http://127.0.0.1:3000/plain-without-header',
        timeout: 3000,
        enableChunked: true,
        header: {}
    });
}

export function streamWithHeader(request) {
    runRequest(request, {
        url: 'http://127.0.0.1:3000/stream-with-header',
        timeout: 20000,
        enableChunked: true,
        header: {}
    });
}

export function streamWithoutHeader(request) {
    runRequest(request, {
        url: 'http://127.0.0.1:3000/stream-without-header',
        timeout: 20000,
        enableChunked: true,
        header: {}
    });
}

export function streamTimeout(request) {
    runRequest(request, {
        url: 'http://127.0.0.1:3000/stream-timeout',
        timeout: 3000,
        enableChunked: true,
        header: {}
    });
}