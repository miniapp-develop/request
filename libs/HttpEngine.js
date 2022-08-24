const NOP_PROXY = {
    request: () => {
        return Promise.reject({
            msg: 'no http proxy'
        });
    }
};

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