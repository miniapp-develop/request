export function requestPlainText(request) {
    request({
        url: 'http://127.0.0.1:3000/plain/',
        timeout: 3000,
        enableChunked: true,
        header: {}
    }).then((res) => {
        console.log('[Page Streams]:res=', res);
        res.data.on('data', (chunk) => {
            console.log('[Page Streams]:data chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
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


export function streamWithHeader(request) {
    request({
        url: 'http://127.0.0.1:3000/stream-with-header',
        timeout: 20000,
        enableChunked: true,
        header: {}
    }).then((res) => {
        console.log('[Page Streams]:res=', res);
        res.data.on('data', (chunk) => {
            console.log('[Page Streams]:data chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
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


export function streamWithoutHeader(request) {
    request({
        url: 'http://127.0.0.1:3000/stream-without-header',
        timeout: 20000,
        enableChunked: true,
        header: {}
    }).then((res) => {
        console.log('[Page Streams]:res=', res);
        res.data.on('data', (chunk) => {
            console.log('[Page Streams]:data chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
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


export function streamTimeout(request) {
    request({
        url: 'http://127.0.0.1:3000/stream-timeout',
        timeout: 3000,
        enableChunked: true,
        header: {}
    }).then((res) => {
        console.log('[Page Streams]Timeout:res=', res);
        res.data.on('data', (chunk) => {
            console.log('[Page Streams]Timeout data:chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
        });
        res.data.on('end', () => {
            console.log('[Page Streams]Timeout:end');
        });
        res.data.on('error', (err) => {
            console.error('[Page Streams]Timeout:error', err);
        });
    }).catch((err) => {
        console.error('[Page Streams]Timeout:err=', err);
    });
}