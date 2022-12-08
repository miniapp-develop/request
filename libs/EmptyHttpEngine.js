const HttpEngine = require('./HttpEngine');

class EmptyHttpEngine extends HttpEngine {
    constructor() {
        super(...arguments);
    }

    _handleRequest(option) {
        return Promise.reject({
            option,
            msg: 'empty engine!'
        });
    }
}

module.exports = EmptyHttpEngine;
