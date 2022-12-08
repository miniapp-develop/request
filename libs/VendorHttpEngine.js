const HttpEngine = require('./HttpEngine');

const qs = {
    stringify(data) {
        if (!data) {
            return '';
        }
        return Object.entries(data)
            .map(([key, value]) => {
                return encodeURIComponent(key) + '=' + encodeURIComponent(value)
            }).join('&');
    }
}

class VendorHttpEngine extends HttpEngine {
    constructor(proxy, preset = {}) {
        super(preset);
        this._proxy = proxy;
    }

    _handleRequest(option) {
        if (option.headers && !option.header) { //小程序的接口字段命名令人尴尬
            option.header = option.headers;
        }
        //微信小程序的转换规则 https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
        if (option.params) {
            if (option.method.toUpperCase() === 'GET') {
                if (!option.data || option.data.constructor !== Object) {
                    option.data = option.params; // 小程序会自己将 data 添加到 url 上。
                }
            } else {
                const queryString = qs.stringify(option.params);
                if (queryString.length) {
                    if (option.url.indexOf('?') === -1) {
                        option.url += '?' + queryString;
                    } else if (option.url.endsWith('?')) {
                        option.url += queryString;
                    } else {
                        option.url += '&' + queryString;
                    }
                }
            }
        }
        return new Promise((resolve, reject) => {
            const task = this._proxy.request({
                ...this.preset,
                ...option,
                success(res) {
                    resolve(res);
                },
                fail(err) {
                    reject(err);
                },
                complete() {

                }
            });
            if (option.signal) {
                option.signal._attachTask_(task);
                if (option.signal.aborted) {
                    task.abort();
                }
            }
        });
    }
}

module.exports = VendorHttpEngine;
