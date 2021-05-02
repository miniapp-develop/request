const AbortSignal = require('./AbortSignal');

class AbortController {
    constructor() {
        this.signal = new AbortSignal();
    }

    abort() {
        this.signal._abort_();
    }
}

module.exports = AbortController;