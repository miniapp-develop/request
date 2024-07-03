export function requestStream(request) {
    request({
        url: 'http://127.0.0.1:3000/stream',
        timeout: 3000,
        enableChunked: true,
        header: {}
    }).then((res) => {
        console.log('requestStream:res=', res);
        res.data.on('data', (chunk) => {
            console.log('requestStream:data chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
        });
        res.data.on('end', () => {
            console.log('requestStream:end');
        });
        res.data.on('error', err => {
            console.error('requestStream:error', err);
        });
    }).catch((err) => {
        console.error('requestStream:err=', err);
    });
}

export function requestStreamTimeout(request) {
    request({
        url: 'http://127.0.0.1:3000/stream-timeout',
        timeout: 3000,
        enableChunked: true,
        header: {}
    }).then((res) => {
        console.log('requestStreamTimeout:res=', res);
        res.data.on('data', (chunk) => {
            console.log('requestStreamTimeout data:chunk=', chunk, new TextDecoder('utf-8').decode(chunk));
        });
        res.data.on('end', () => {
            console.log('requestStreamTimeout:end');
        });
        res.data.on('error', (err) => {
            console.error('requestStreamTimeout:error', err);
        });
    }).catch((err) => {
        console.error('requestStreamTimeout:err=', err);
    });
}