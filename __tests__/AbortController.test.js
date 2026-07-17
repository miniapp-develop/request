const AbortController = require('../libs/AbortController');

function createTask() {
    return { abort: jest.fn() };
}

describe('AbortController', () => {
    test('signal.aborted is false before abort', () => {
        const controller = new AbortController();

        expect(controller.signal.aborted).toBe(false);
    });

    test('abort sets signal.aborted to true', () => {
        const controller = new AbortController();
        controller.abort();

        expect(controller.signal.aborted).toBe(true);
    });

    test('abort aborts an attached task', () => {
        const controller = new AbortController();
        const task = createTask();
        controller.signal._attachTask_(task);

        controller.abort();

        expect(task.abort).toHaveBeenCalledTimes(1);
    });

    test('abort aborts all tasks attached to the same signal', () => {
        const controller = new AbortController();
        const taskA = createTask();
        const taskB = createTask();
        controller.signal._attachTask_(taskA);
        controller.signal._attachTask_(taskB);

        controller.abort();

        expect(taskA.abort).toHaveBeenCalledTimes(1);
        expect(taskB.abort).toHaveBeenCalledTimes(1);
    });

    test('abort triggers onabort callback only when a task was attached', () => {
        const controller = new AbortController();
        const onabort = jest.fn();
        controller.signal.onabort = onabort;
        controller.signal._attachTask_(createTask());

        controller.abort();

        expect(onabort).toHaveBeenCalledTimes(1);
    });

    test('abort does not trigger onabort when no task was ever attached', () => {
        const controller = new AbortController();
        const onabort = jest.fn();
        controller.signal.onabort = onabort;

        controller.abort();

        expect(onabort).not.toHaveBeenCalled();
    });

    test('calling abort twice only aborts tasks once', () => {
        const controller = new AbortController();
        const task = createTask();
        controller.signal._attachTask_(task);

        controller.abort();
        controller.abort();

        expect(task.abort).toHaveBeenCalledTimes(1);
    });

    test('attaching a task after abort does not call task.abort automatically', () => {
        const controller = new AbortController();
        controller.abort();
        const task = createTask();

        controller.signal._attachTask_(task);

        expect(task.abort).not.toHaveBeenCalled();
    });
});
