const next = require('@xesam/next');
const HttpEngine = require('./HttpEngine');

function create(engine) {
    function _request(req) {
        return _request.handle(req);
    }

    _request.create = create;
    _request.engine = engine;
    _request.reqInterceptors = next();
    _request.resInterceptors = next();
    _request.addRequestInterceptor = function (interceptor) {
        this.reqInterceptors.use(interceptor);
        return this;
    }

    _request.addResponseInterceptor = function (interceptor) {
        this.resInterceptors.use(interceptor);
        return this;
    }

    _request.handle = function (req) {
        return this.reqInterceptors(req)
            .then(this.engine.request.bind(this.engine))
            .then(this.resInterceptors.bind(this));
    }

    return _request;
}

const request = create(typeof wx === 'object' ? new HttpEngine(wx) : null);

module.exports = request;
