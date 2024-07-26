const HttpEngine = require('./HttpEngine');
const Response = require('./Response');

const qs = {
    stringify(data) {
        if (!data) {
            return '';
        }
        return Object.entries(data)
            .map(([key, value]) => {
                return encodeURIComponent(key) + '=' + encodeURIComponent(value);
            })
            .join('&');
    }
};

class VendorHttpEngine extends HttpEngine {
    constructor(vendor, preset = {}) {
        super(preset);
        this._vendorRequest = vendor.request.bind(vendor);
    }

    _handleRequest(option) {
        if (option.headers && !option.header) {
            //小程序的接口字段命名真是令人尴尬
            option.header = option.headers;
        }
        //微信小程序的转换规则 https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
        if (option.params) {
            if (option.method.toUpperCase() === 'GET') {
                if (!option.data) {
                    option.data = option.params; // 小程序会自己将 data 添加到 url 上。
                }
            } else {
                const queryString = qs.stringify(option.params);
                if (queryString.length > 0) {
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
            const enableChunked = !!option.enableChunked;
            const enableChunkedBuffer = option.hasOwnProperty('enableChunkedBuffer') ? !!option.enableChunkedBuffer : true;
            const response = new Response(enableChunked, enableChunkedBuffer);
            const task = this._vendorRequest({
                ...option,
                success(res) {
                    // 对于 Chunked 传输，success 在传输完毕之后才会调用
                    response._onSuccess(res);
                    if (!response.enableChunked) {
                        resolve(response);
                    }
                },
                fail(err) {
                    response._onFail(err);
                    reject(err);
                }
            });
            if (option.signal) {
                option.signal._attachTask_(task);
                if (option.signal.aborted) {
                    task.abort();
                }
            }
            task.onHeadersReceived((headerData) => {
                response._onHeadersReceived(headerData);
                if (response.enableChunked) {
                    resolve(response);
                }
            });
            task.onChunkReceived(response._onChunkReceived.bind(response));
        });
    }
}

module.exports = VendorHttpEngine;
