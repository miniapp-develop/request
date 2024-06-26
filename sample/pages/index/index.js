const { request, AbortController } = require('@mini-dev/request');

request
    .addRequestInterceptor((req) => {
        return new Promise((resolve) => {
            console.log('this is request interceptor A');
            setTimeout(function() {
                resolve(req);
            }, 500);
        });
    })
    .addRequestInterceptor((req) => {
        console.log('this is request interceptor B');
        return req;
    })
    .addResponseInterceptor((res) => {
        console.log('this is response interceptor A');
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(res);
            }, 500);
        });
    })
    .addResponseInterceptor((res) => {
        console.log('this is response interceptor B');
        return res;
    });

Page({
    onLoad(query) {
    },
    onTap(e) {
        const method = e.currentTarget.dataset.method;
        if (method === 'GET') {
            request({
                url: 'https://httpbin.org/get?urlname=urlget',
                data: {
                    name: 'get name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'GET WITH PARAMS') {
            request({
                url: 'https://httpbin.org/get?urlname=urlget',
                params: {
                    name: 'get_params_name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'POST') {
            request({
                url: 'https://httpbin.org/post?urlname=urlpost',
                method: 'post',
                data: {
                    name: 'post_data_name'
                },
                params: {
                    name: 'params_data_name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'DELETE') {
            request({
                url: 'https://httpbin.org/delete?urlname=urldelete',
                method: 'delete',
                data: {
                    name: 'delete name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'PUT') {
            request({
                url: 'https://httpbin.org/put?urlname=urlput',
                method: 'put',
                data: {
                    name: 'put name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'PATCH') {
            request({
                url: 'https://httpbin.org/patch?urlname=urlpatch',
                method: 'patch',
                data: {
                    name: 'patch name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'OPTIONS') {
            request({
                url: 'https://httpbin.org',
                method: 'OPTIONS',
                data: {
                    name: 'OPTIONS name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'HEAD') {
            request({
                url: 'https://httpbin.org',
                method: 'HEAD',
                data: {
                    name: 'HEAD name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'TRACE') {
            request({
                url: 'https://httpbin.org',
                method: 'TRACE',
                data: {
                    name: 'TRACE name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'CONNECT') {
            request({
                url: 'https://httpbin.org',
                method: 'CONNECT',
                data: {
                    name: 'CONNECT name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    },
    onTapTimeout() {
        request({
            url: 'https://httpbin.org/delay/8',
            timeout: 3000,
            header: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            }
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.error(err);
        });
    },
    onTapAbort() {
        const controller = new AbortController();
        request({
            url: 'https://httpbin.org/delay/8',
            signal: controller.signal
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.error(err);
        });
        controller.abort();
    },
    onTapStream(e) {
        request({
            url: 'http://127.0.0.1:3000/stream',
            timeout: 3000,
            enableChunked: true,
            header: {}
        }).then((res) => {
            console.log('onTapStream:res=', res);
        }).catch((err) => {
            console.error('onTapStream:err=', err);
        });
    },
    onTapStreamTimeout(e) {
        request({
            url: 'http://127.0.0.1:3000/stream-timeout',
            timeout: 3000,
            enableChunked: true,
            header: {}
        }).then((res) => {
            console.log('onTapStream:res=', res);
        }).catch((err) => {
            console.error('onTapStream:err=', err);
        });
    }
});
