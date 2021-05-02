const {request} = require('../../libs/index');

request.addRequestInterceptor(req => {
    return new Promise(resolve => {
        console.log('this is a request interceptor');
        setTimeout(function () {
            resolve(req);
        }, 1000);
    })
}).addResponseInterceptor(res => {
    return new Promise(resolve => {
        console.log('this is a response interceptor');
        setTimeout(function () {
            resolve(res);
        }, 1000);
    })
})

Page({
    onLoad(query) {
    },
    onTapGet(e) {
        request({
            url: 'https://www.baidu.com'
        }).then(res => {
            console.log(res);
        }).catch(err => {
            console.error(err);
        });
    }
})
