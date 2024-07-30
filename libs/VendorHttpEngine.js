const HttpEngine = require('./HttpEngine');
const Response = require('./Response');
const { urlStringify } = require('./qs');

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
                option.url = urlStringify(option.url, option.params); //如果不想把参数添加到 url 上，就直接使用 data 字段，而不应该使用 params 字段
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
