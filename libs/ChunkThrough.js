class ChunkThrough {
    constructor({ enableBuffer } = { enableBuffer: true }) {
        this._events = {};
        this._finished = false;
        this._enableBuffer = enableBuffer;
        this._buffers = {};
    }

    on(event, handler) {
        if (!this._events[event]) {
            this._events[event] = [];
            if (this._enableBuffer) {
                if (this._buffers[event]) {
                    for (const data of this._buffers[event]) {
                        handler(data);
                    }
                    delete this._buffers[event];
                }
            }
        }
        this._events[event].push(handler);
    }

    emit(event, data) {
        if (this._finished) {
            return;
        }
        const handlers = this._events[event];
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        } else if (this._enableBuffer) {
            if (!this._buffers[event]) {
                this._buffers[event] = [];
            }
            this._buffers[event].push(data);
        }
    }

    end() {
        this.emit('end');
        this._finished = true;
    }

    error(err) {
        this.emit('error', err);
        this._finished = true;
    }
}

module.exports = ChunkThrough;
