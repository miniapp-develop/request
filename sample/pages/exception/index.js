const { request, AbortController } = require('../../app.request');

Page({
    onLoad(query) {
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
    }
});
