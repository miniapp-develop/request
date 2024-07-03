const { request, AbortController } = require('@mini-dev/request');

request
    .addRequestInterceptor((req) => {
        return new Promise((resolve) => {
            console.log('[request] interceptor A');
            setTimeout(function() {
                resolve(req);
            }, 500);
        });
    })
    .addRequestInterceptor((req) => {
        console.log('[request] interceptor B');
        return req;
    })
    .addResponseInterceptor((res) => {
        console.log('[response] interceptor A');
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(res);
            }, 500);
        });
    })
    .addResponseInterceptor((res) => {
        console.log('[response] interceptor B');
        return res;
    });

export default request;