const VendorHttpEngine = require('./VendorHttpEngine');
const EmptyHttpEngine = require('./EmptyHttpEngine');

function _async(interceptors, data) {
    let index = 0;
    const next = function (res) {
        const nextInterceptor = interceptors[index++];
        if (!nextInterceptor) {
            return Promise.resolve(res);
        }
        const ret = nextInterceptor.call(nextInterceptor, res);
        if (ret && ret.then) {
            return ret.then(next);
        } else {
            return next(ret);
        }
    };
    return next(data);
}

function getDefaultHttpEngine() {
    return typeof wx === 'object' ? new VendorHttpEngine(wx) : new EmptyHttpEngine();
}

function create(engine = getDefaultHttpEngine()) {
    function _request(req) {
        return _request.handle(req);
    }

    _request.create = create;
    _request.engine = engine;
    _request.requestInterceptors = [];
    _request.responseInterceptors = [];
    _request.addRequestInterceptor = function (interceptor) {
        this.requestInterceptors.unshift(interceptor);
        return this;
    }

    _request.addResponseInterceptor = function (interceptor) {
        this.responseInterceptors.push(interceptor);
        return this;
    }

    _request.handle = function (req) {
        return _async(this.requestInterceptors, req)
            .then(this.engine.request.bind(this.engine))
            .then(res => {
                return _async(this.responseInterceptors, res);
            });
    }

    return _request;
}

const request = create();

module.exports = request;
