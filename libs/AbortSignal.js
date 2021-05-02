class AbortSignal {
    constructor() {
        this.aborted = false;
        this.onabort = () => {
        };
        this._task = null;
    }

    _attachTask_(task) {
        this._task = task;
    }

    _abort_() {
        if (this._task && !this.aborted) {
            this._task.abort();
            this.aborted = true;
            this.onabort && this.onabort();
        }
    }
}

module.exports = AbortSignal;