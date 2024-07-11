const { request } = require('@mini-dev/request');

request
    .addRequestInterceptor((req) => {
        return new Promise((resolve) => {
            console.log('[request] interceptor A', req);
            setTimeout(function() {
                resolve(req);
            }, 500);
        });
    })
    .addRequestInterceptor((req) => {
        console.log('[request] interceptor B', req);
        return req;
    })
    .addResponseInterceptor((res, req) => {
        console.log('[response] interceptor A', res, req);
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(res);
            }, 500);
        });
    })
    .addResponseInterceptor((res, req) => {
        console.log('[response] interceptor B', res, req);
        return res;
    });

export default request;