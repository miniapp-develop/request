const Options = require("./Options");

const NOP_PROXY = {
    request: () => {
        return Promise.reject({
            msg: 'no http proxy'
        });
    }
};

class HttpEngine {
    constructor(proxy = runtime.host) {
        this.proxy = proxy || NOP_PROXY;
    }

    fetch(url, options) {
        return new Promise((resolve, reject) => {
            const task = this.proxy.request({
                url: url,
                method: options[Options.method],
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