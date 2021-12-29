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

    request(options = {}) {
        return new Promise((resolve, reject) => {
            const task = this.proxy.request({
                ...this.preset,
                ...options,
                success(res) {
                    resolve(res);
                },
                fail(err) {
                    reject(err);
                },
                complete() {

                }
            });
            if (options.signal) {
                options.signal._attachTask_(task);
            }
        });
    }
}

module.exports = HttpEngine;