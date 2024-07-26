const ChunkThrough = require('./ChunkThrough');

class Response {
    constructor(enableChunked = false, enableChunkedBuffer = ture) {
        this._enableChunked = enableChunked;
        if (this._enableChunked) {
            this._data = new ChunkThrough({ buffer: enableChunkedBuffer });
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
        if (this._enableChunked) {
            this._data.end();
        } else {
            this._data = res.data;
        }
    }

    _onFail(err) {
        if (this._enableChunked) {
            this._data.error(err);
        }
    }

    get enableChunked() {
        return this._enableChunked;
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
