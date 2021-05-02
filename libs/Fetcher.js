export default class Fetcher {
    constructor(engine) {
        this.engine = engine;
        this.reqInterceptors = [];
        this.resInterceptors = [];
    }

    addRequestInterceptor(interceptor) {
        this.reqInterceptors.push(interceptor);
        return this;
    }

    addResponseInterceptor(interceptor) {
        this.resInterceptors.push(interceptor);
        return this;
    }

    fetch(url, options) {
        let req = {url, options};
        for (let reqInterceptor of this.reqInterceptors) {
            req = reqInterceptor(req);
        }
        return this.engine.fetch(req.url, req.options)
            .then(res => {
                for (let resInterceptor of this.resInterceptors) {
                    res = resInterceptor(res);
                }
                return res;
            });

    }
}