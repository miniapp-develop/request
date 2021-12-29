# miniapp request

```javascript
const {request} = require('../../libs/index');

request.addRequestInterceptor(req => {
    return new Promise(resolve => {
        console.log('this is request interceptor A');
        setTimeout(function () {
            resolve(req);
        }, 1000);
    })
}).addRequestInterceptor(req => {
    console.log('this is request interceptor B');
    return req;
}).addResponseInterceptor(res => {
    console.log('this is response interceptor A');
    return new Promise(resolve => {
        setTimeout(function () {
            resolve(res);
        }, 1000);
    })
}).addResponseInterceptor(res => {
    console.log('this is response interceptor B');
    return res;
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

```