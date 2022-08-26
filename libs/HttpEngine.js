const NOP_PROXY = {
    request: () => {
        return Promise.reject({
            msg: 'no http proxy'
        });
    }
};

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

class HttpEngine {
    constructor(proxy = NOP_PROXY, preset = {}) {
        this.proxy = proxy;
        this.preset = preset
    }

    request(option = {}) {
        return new Promise((resolve, reject) => {
            if (option.headers && !option.header) { //小程序的接口字段命名令人尴尬
                option.header = option.headers;
            }
            if (!option.method) {
                option.method = 'GET';
            }
            //微信小程序的转换规则 https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
            if (option.params) {
                if (option.method.toUpperCase() === 'GET') {
                    if (!option.data || option.data.constructor !== Object) {
                        option.data = option.params;
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
            const task = this.proxy.request({
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

module.exports = HttpEngine;