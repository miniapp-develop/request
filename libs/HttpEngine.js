class HttpEngine {
    constructor(preset = {}) {
        this._preset = preset;
    }

    _handleRequest(option) {
        throw Error('no implement');
    }

    request(option = {}) {
        const reqOption = { ...this._preset, ...option };
        if (!reqOption.method) {
            reqOption.method = 'GET';
        }
        return this._handleRequest(reqOption);
    }
}

module.exports = HttpEngine;
