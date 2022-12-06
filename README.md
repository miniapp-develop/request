# miniapp request

一个简单的小程序 request 封装，支持：

1. 自定义拦截器（RequestInterceptor、ResponseInterceptor）；
2. Promise；
3. 取消请求；
4. 更友好的接口字段命名；

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

上述方式引用的是默认 request 对象，如果需要多个不同的request，可以自行创建：

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

注意：上述拦截器的调用顺序为：

    request interceptor B 
    -> request interceptor A 
    -> {http request}
    -> response interceptor A 
    -> response interceptor B

即“洋葱顺序”。

### 页面调用

```javascript
Page({
    onLoad(query) {
    },
    onTapGet(e) {
        const controller = new AbortController();
        request({
            url: 'https://httpbin.org/get',
            method: 'get', //默认使用 get
            params: {},
            data: {},
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

## ChangeLogs

### 0.1.0
