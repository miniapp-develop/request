# miniapp request

小程序 http 请求方法的封装。

## 使用方法

### 安装依赖

```shell script
npm i @mini-dev/request
```

### 创建 request 对象。

```javascript
const {request} = require('@mini-dev/request');
request({...});
```

或者 

```javascript
const {request} = require('@mini-dev/request');
const anotherRequest = request.create();
anotherRequest({...});
```

### 添加拦截器

```javascript
const {request} = require('@mini-dev/request');

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

```

### 页面调用

```javascript
Page({
    onLoad(query) {
    },
    onTapGet(e) {
        const controller = new AbortController();
        request({
            url: 'https://httpbin.org/get',
            method:'get', //默认使用 get
            params:{},
            data:{},
            signal: controller.signal
        }).then(res => {
            console.log(res);
        }).catch(err => {
            console.error(err);
        });
        controller.abort();
    }
})
```