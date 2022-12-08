class HttpEngine {
    constructor(preset = {}) {
        this._preset = preset
    }

    _handleRequest(option) {
        throw Error('no implement');
    }

    request(option = {}) {
        option = {...this._preset, ...option};
        if (!option.method) {
            option.method = 'GET';
        }
        return this._handleRequest(option);
    }
}

module.exports = HttpEngine;
