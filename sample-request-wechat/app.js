const { request } = require('@mini-dev/request-wx');

// 全局两段式拦截器：注册在共享单例上，所有直接用 `request` 的页面都经过它们。
// 需要独立实例（不经这些拦截器）的页面用 createRequest() 自建。
request
    .addRequestInterceptor((req) => {
        return new Promise((resolve) => {
            console.log('[request] interceptor A', req);
            setTimeout(function () {
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
            setTimeout(function () {
                resolve(res);
            }, 500);
        });
    })
    .addResponseInterceptor((res, req) => {
        console.log('[response] interceptor B', res, req);
        return res;
    });

App({
    onLaunch() {}
});
