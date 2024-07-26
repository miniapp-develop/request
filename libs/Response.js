const LiteStream = require('./ChunkStream');
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
            this._data = res.data;
        }
    }

    _onFail(err) {
        if (this._enableStream) {
            this._data.error(err);
        }
    }

    get enableChunked() {
        return this._enableStream;
    }

    get headers() {
        return this._headers;
    }

    get header() {
        //兼容小程序的命名方式
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
