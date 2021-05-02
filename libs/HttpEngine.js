const Options = require("./Options");

const NOP_PROXY = {
    request: () => {
        return Promise.reject({
            msg: 'no http proxy'
        });
    }
};

class HttpEngine {
    constructor(proxy = NOP_PROXY) {
        this.proxy = proxy;
    }

    request(options) {
        return new Promise((resolve, reject) => {
            const task = this.proxy.request({
                url: options[Options.url],
                method: options[Options.method] || 'GET',
                data: options[Options.data],
                header: options[Options.headers],
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