class AbortSignal {
    constructor() {
        this.aborted = false;
        this.onabort = () => {
        };
        this._task = null;
    }

    _attachTask_(task) {
        if (this.aborted) {
            return;
        }
        this._task = task;
    }

    _abort_() {
        this.aborted = true;
        if (this._task) {
            this._task.abort();
            this.onabort && this.onabort();
        }
        this._task = null;
    }
}

module.exports = AbortSignal;