const ChunkStream = require('../libs/ChunkStream');

describe('ChunkStream', () => {
    test('on', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();
        chunkStream.on('data', (data) => {
            testHandler(data);
        });

        chunkStream.emit('data', 'test');

        expect(testHandler).toHaveBeenCalledWith('test');
    });
    test('write', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();
        chunkStream.on('data', (data) => {
            testHandler(data);
        });

        chunkStream.write('test');

        expect(testHandler).toHaveBeenCalledWith('test');
    });
    test('when emit after end then nothing is triggered', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();
        chunkStream.on('data', (data) => {
            testHandler(data);
        });

        chunkStream.end();
        chunkStream.emit('data', 'test');

        expect(testHandler).not.toHaveBeenCalled();
    });
    test('when write after end then nothing is triggered', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();
        chunkStream.on('data', (data) => {
            testHandler(data);
        });

        chunkStream.end();
        chunkStream.write('test');

        expect(testHandler).not.toHaveBeenCalled();
    });
    test('when emit after error then nothing is triggered', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();
        chunkStream.on('data', (data) => {
            testHandler(data);
        });

        chunkStream.error();
        chunkStream.emit('data', 'test');

        expect(testHandler).not.toHaveBeenCalled();
    });
    test('when write after error then nothing is triggered', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();
        chunkStream.on('data', (data) => {
            testHandler(data);
        });

        chunkStream.error();
        chunkStream.write('test');

        expect(testHandler).not.toHaveBeenCalled();
    });
    test('when first-on after emit then the buffer is flushed', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();

        chunkStream.emit('data', 'pre 1');
        chunkStream.emit('data', 'pre 2');
        chunkStream.on('data', (data) => {
            testHandler(data);
        });
        chunkStream.emit('data', 'post 1');
        chunkStream.emit('other', 'post 2');

        expect(testHandler).toHaveBeenCalledWith('pre 1');
        expect(testHandler).toHaveBeenCalledWith('pre 2');
        expect(testHandler).toHaveBeenCalledWith('post 1');
        expect(testHandler).not.toHaveBeenCalledWith('post 2');
    });

    test('when on after emit then only the first handler is called', async () => {
        const firstHandler = jest.fn();
        const secondHandler = jest.fn();
        const chunkStream = new ChunkStream();

        chunkStream.emit('data', 'pre 1');
        chunkStream.emit('data', 'pre 2');
        chunkStream.on('data', (data) => {
            firstHandler(data);
        });
        chunkStream.on('data', (data) => {
            secondHandler(data);
        });
        chunkStream.emit('data', 'post 1');

        expect(firstHandler).toHaveBeenCalledWith('pre 1');
        expect(firstHandler).toHaveBeenCalledWith('pre 2');
        expect(firstHandler).toHaveBeenCalledWith('post 1');

        expect(secondHandler).not.toHaveBeenCalledWith('pre 1');
        expect(secondHandler).not.toHaveBeenCalledWith('pre 2');
        expect(secondHandler).toHaveBeenCalledWith('post 1');
    });
});

describe('ChunkStream[buffer = true as default]', () => {
    test('when first-on after emit then the buffer is flushed', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream();

        chunkStream.emit('data', 'pre 1');
        chunkStream.emit('data', 'pre 2');
        chunkStream.on('data', (data) => {
            testHandler(data);
        });
        chunkStream.emit('data', 'post 1');
        chunkStream.emit('other', 'post 2');

        expect(testHandler).toHaveBeenCalledWith('pre 1');
        expect(testHandler).toHaveBeenCalledWith('pre 2');
        expect(testHandler).toHaveBeenCalledWith('post 1');
        expect(testHandler).not.toHaveBeenCalledWith('post 2');
    });

    test('when on after emit then only the first handler is called', async () => {
        const firstHandler = jest.fn();
        const secondHandler = jest.fn();
        const chunkStream = new ChunkStream();

        chunkStream.emit('data', 'pre 1');
        chunkStream.emit('data', 'pre 2');
        chunkStream.on('data', (data) => {
            firstHandler(data);
        });
        chunkStream.on('data', (data) => {
            secondHandler(data);
        });
        chunkStream.emit('data', 'post 1');

        expect(firstHandler).toHaveBeenCalledWith('pre 1');
        expect(firstHandler).toHaveBeenCalledWith('pre 2');
        expect(firstHandler).toHaveBeenCalledWith('post 1');

        expect(secondHandler).not.toHaveBeenCalledWith('pre 1');
        expect(secondHandler).not.toHaveBeenCalledWith('pre 2');
        expect(secondHandler).toHaveBeenCalledWith('post 1');
    });
});

describe('ChunkStream[buffer = false]', () => {
    test('when first-on after emit then the buffer is disabled', async () => {
        const testHandler = jest.fn();
        const chunkStream = new ChunkStream({ buffer: false });

        chunkStream.emit('data', 'pre 1');
        chunkStream.emit('data', 'pre 2');
        chunkStream.on('data', (data) => {
            testHandler(data);
        });
        chunkStream.emit('data', 'post 1');
        chunkStream.emit('other', 'post 2');

        expect(testHandler).not.toHaveBeenCalledWith('pre 1');
        expect(testHandler).not.toHaveBeenCalledWith('pre 2');
        expect(testHandler).toHaveBeenCalledWith('post 1');
        expect(testHandler).not.toHaveBeenCalledWith('post 2');
    });
});
