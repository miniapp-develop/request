class ResponseStream {

    constructor() {
        this._events = {};
    }

    on(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }

        this._events[event].push(callback);
    }

    emit(event, data) {
        if (this._events[event]) {
            this._events[event].forEach(callback => {
                callback(data);
            });
        }
    }

    write(chunk) {
        this.emit('data', chunk);
    }

    end() {
        this.emit('end');
    }

    error(err) {
        this.emit('error', err);
    }
}

class Response {
    constructor(enableStream = false, res) {
        this._headers = {};
        if (enableStream) {
            this._stream = new ResponseStream();
        } else {
            this._data = '';
        }
    }

    get stream() {
        return this._stream;
    }

    _onHeadersReceived(data) {
        this._headers = data.header;
        this._statusCode = data.statusCode;
        this._cookies = data.cookies;
    }

    _onChunkReceived(chunk) {
        this._stream.write(chunk.data);
    }

    _onSuccess(res) {
        if (this._stream) {
            this._stream.end();
        } else {
            this._onHeadersReceived(res);
            this._data = res.data;
        }
    }

    _onFail(err) {
        this._stream.error(err);
    }

    get headers() {
        return this._headers;
    }

    get header() {
        return this.headers;
    }

    get statusCode() {
        return this._statusCode;
    }

    get cookies() {
        return this._cookies;
    }

    get data() {
        if (this._stream) {
            return this._stream;
        } else {
            return this._data;
        }
    }
}

module.exports = Response;