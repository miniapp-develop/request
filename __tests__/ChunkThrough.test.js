const ChunkThrough = require('../libs/ChunkThrough');

describe('ChunkThrough', () => {
    test('on', async () => {
        const testHandler = jest.fn();
        const chunkThrough = new ChunkThrough();
        chunkThrough.on('data', (data) => {
            testHandler(data);
        });

        chunkThrough.emit('data', 'test');

        expect(testHandler).toHaveBeenCalledWith('test');
    });
    test('when emit after end then nothing is triggered', async () => {
        const testHandler = jest.fn();
        const chunkThrough = new ChunkThrough();
        chunkThrough.on('data', (data) => {
            testHandler(data);
        });

        chunkThrough.end();
        chunkThrough.emit('data', 'test');

        expect(testHandler).not.toHaveBeenCalled();
    });
    test('when emit after error then nothing is triggered', async () => {
        const testHandler = jest.fn();
        const chunkThrough = new ChunkThrough();
        chunkThrough.on('data', (data) => {
            testHandler(data);
        });

        chunkThrough.error();
        chunkThrough.emit('data', 'test');

        expect(testHandler).not.toHaveBeenCalled();
    });
    test('when first-on after emit then the buffer is flushed', async () => {
        const testHandler = jest.fn();
        const chunkThrough = new ChunkThrough();

        chunkThrough.emit('data', 'pre 1');
        chunkThrough.emit('data', 'pre 2');
        chunkThrough.on('data', (data) => {
            testHandler(data);
        });
        chunkThrough.emit('data', 'post 1');
        chunkThrough.emit('other', 'post 2');

        expect(testHandler).toHaveBeenCalledWith('pre 1');
        expect(testHandler).toHaveBeenCalledWith('pre 2');
        expect(testHandler).toHaveBeenCalledWith('post 1');
        expect(testHandler).not.toHaveBeenCalledWith('post 2');
    });

    test('when on after emit then only the first handler is called', async () => {
        const firstHandler = jest.fn();
        const secondHandler = jest.fn();
        const chunkThrough = new ChunkThrough();

        chunkThrough.emit('data', 'pre 1');
        chunkThrough.emit('data', 'pre 2');
        chunkThrough.on('data', (data) => {
            firstHandler(data);
        });
        chunkThrough.on('data', (data) => {
            secondHandler(data);
        });
        chunkThrough.emit('data', 'post 1');

        expect(firstHandler).toHaveBeenCalledWith('pre 1');
        expect(firstHandler).toHaveBeenCalledWith('pre 2');
        expect(firstHandler).toHaveBeenCalledWith('post 1');

        expect(secondHandler).not.toHaveBeenCalledWith('pre 1');
        expect(secondHandler).not.toHaveBeenCalledWith('pre 2');
        expect(secondHandler).toHaveBeenCalledWith('post 1');
    });
});

describe('ChunkThrough[buffer = true as default]', () => {
    test('when first-on after emit then the buffer is flushed', async () => {
        const testHandler = jest.fn();
        const chunkThrough = new ChunkThrough();

        chunkThrough.emit('data', 'pre 1');
        chunkThrough.emit('data', 'pre 2');
        chunkThrough.on('data', (data) => {
            testHandler(data);
        });
        chunkThrough.emit('data', 'post 1');
        chunkThrough.emit('other', 'post 2');

        expect(testHandler).toHaveBeenCalledWith('pre 1');
        expect(testHandler).toHaveBeenCalledWith('pre 2');
        expect(testHandler).toHaveBeenCalledWith('post 1');
        expect(testHandler).not.toHaveBeenCalledWith('post 2');
    });

    test('when on after emit then only the first handler is called', async () => {
        const firstHandler = jest.fn();
        const secondHandler = jest.fn();
        const chunkThrough = new ChunkThrough();

        chunkThrough.emit('data', 'pre 1');
        chunkThrough.emit('data', 'pre 2');
        chunkThrough.on('data', (data) => {
            firstHandler(data);
        });
        chunkThrough.on('data', (data) => {
            secondHandler(data);
        });
        chunkThrough.emit('data', 'post 1');

        expect(firstHandler).toHaveBeenCalledWith('pre 1');
        expect(firstHandler).toHaveBeenCalledWith('pre 2');
        expect(firstHandler).toHaveBeenCalledWith('post 1');

        expect(secondHandler).not.toHaveBeenCalledWith('pre 1');
        expect(secondHandler).not.toHaveBeenCalledWith('pre 2');
        expect(secondHandler).toHaveBeenCalledWith('post 1');
    });
});

describe('ChunkThrough[buffer = false]', () => {
    test('when first-on after emit then the buffer is disabled', async () => {
        const testHandler = jest.fn();
        const chunkThrough = new ChunkThrough({ enableBuffer: false });

        chunkThrough.emit('data', 'pre 1');
        chunkThrough.emit('data', 'pre 2');
        chunkThrough.on('data', (data) => {
            testHandler(data);
        });
        chunkThrough.emit('data', 'post 1');
        chunkThrough.emit('other', 'post 2');

        expect(testHandler).not.toHaveBeenCalledWith('pre 1');
        expect(testHandler).not.toHaveBeenCalledWith('pre 2');
        expect(testHandler).toHaveBeenCalledWith('post 1');
        expect(testHandler).not.toHaveBeenCalledWith('post 2');
    });
});
