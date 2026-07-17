class AbortSignal {
    constructor() {
        this.aborted = false;
        this.onabort = () => {
        };
        this._tasks = [];
    }

    _attachTask_(task) {
        if (this.aborted) {
            return;
        }
        this._tasks.push(task);
    }

    _abort_() {
        if (this.aborted) {
            return;
        }
        this.aborted = true;
        const tasks = this._tasks;
        this._tasks = [];
        for (const task of tasks) {
            task.abort();
        }
        if (tasks.length > 0) {
            this.onabort && this.onabort();
        }
    }
}

module.exports = AbortSignal;