import request from '../../app.request';
request.mount();
request.mount(wx, 'requestx');

Page({
    onLoad(query) {
        request.mount(this, 'request');
    },
    onTap(e) {
        const method = e.currentTarget.dataset.method;
        if (method === 'request') {
            request({
                url: 'https://httpbin.org/get?urlname=urlget',
                data: {
                    name: 'get name'
                }
            })
                .then((res) => {
                    console.log(res);
                    console.log('data', res.data);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'wx.request') {
            wx.request({
                url: 'https://httpbin.org/get?urlname=urlget',
                data: {
                    name: 'get name'
                }
            })
                .then((res) => {
                    console.log(res);
                    console.log('data', res.data);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'wx.requestx') {
            wx.requestx({
                url: 'https://httpbin.org/get?urlname=urlget',
                data: {
                    name: 'get name'
                }
            })
                .then((res) => {
                    console.log(res);
                    console.log('data', res.data);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'this.request') {
            this.request({
                url: 'https://httpbin.org/get?urlname=urlget',
                data: {
                    name: 'get name'
                }
            })
                .then((res) => {
                    console.log(res);
                    console.log('data', res.data);
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    }
});
