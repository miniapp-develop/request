class LiteStream {

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
        this._enableStream = enableStream;
        if (this._enableStream) {
            this._data = new LiteStream();
        } else {
            this._data = '';
        }
    }

    _onHeadersReceived(data) {
        this._headers = data.header;
        this._statusCode = data.statusCode;
        this._cookies = data.cookies;
    }

    _onChunkReceived(chunk) {
        this._data.write(chunk.data);
    }

    _onSuccess(res) {
        if (this._enableStream) {
            this._data.end();
        } else {
            this._onHeadersReceived(res);
            this._data = res.data;
        }
    }

    _onFail(err) {
        if (this._enableStream) {
            this._data.error(err);
        }
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
        return this._data;
    }
}

module.exports = Response;