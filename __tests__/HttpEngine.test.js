const EmptyHttpEngine = require('../libs/EmptyHttpEngine');

describe('HttpEngine', () => {
    beforeEach(() => {
    })
    test('when option.method is empty then use GET', done => {
        const httpEngine = new EmptyHttpEngine();

        httpEngine.request({}).catch(err => {
            expect(err.option.method).toBe('GET');
            done();
        });
    })
    test('when option is not null then format option', done => {
        const httpEngine = new EmptyHttpEngine();

        httpEngine.request({
            method: 'post',
            headers: {
                k: 'v'
            },
            xxx: 'yyy'
        }).catch(err => {
            expect(err.option.method).toBe('post');
            expect(err.option.xxx).toStrictEqual('yyy');
            expect(err.option.headers).toStrictEqual({
                k: 'v'
            });
            done();
        });
    })
})
