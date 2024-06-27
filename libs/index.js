const VendorHttpEngine = require('./VendorHttpEngine');

function _async(interceptors, data) {
    let index = 0;
    const next = function(res) {
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

const _DefaultHttpEngine = typeof wx === 'object' ? new VendorHttpEngine(wx) : null;

function create(engine = _DefaultHttpEngine) {

    function _request(req) {
        return _request.handle(req);
    }

    _request.create = create;
    _request.engine = engine;
    _request.requestInterceptors = [];
    _request.responseInterceptors = [];
    _request.addRequestInterceptor = function(interceptor) {
        this.requestInterceptors.unshift(interceptor);
        return this;
    };

    _request.addResponseInterceptor = function(interceptor) {
        this.responseInterceptors.push(interceptor);
        return this;
    };

    _request.handle = function(req) {
        if (!this.engine) {
            throw new Error('No engine found');
        }
        return _async(this.requestInterceptors, req)
            .then(this.engine.request.bind(this.engine))
            .then(res => {
                return _async(this.responseInterceptors, res);
            });
    };
    _request.mount = function(host, name = 'request') {
        if (host) {
            Object.defineProperty(host, name, { value: _request });
        } else if (typeof wx === 'object') {
            Object.defineProperty(wx, name, { value: _request });
        }
    };

    return _request;
}

const request = create();

exports.request = request;
exports.HttpEngine = require('./HttpEngine');
exports.AbortController = require('./AbortController');
exports.AbortSignal = require('./AbortSignal');
