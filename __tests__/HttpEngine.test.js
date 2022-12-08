const HttpEngine = require('../libs/HttpEngine');

describe('HttpEngine', () => {
    beforeEach(() => {
    })
    test('when option.method is empty then use GET', async () => {
        const proxy = {
            request: option => option.success(option)
        };
        const httpEngine = new HttpEngine(proxy);
        const res = await httpEngine.request({});

        expect(res.method).toBe('GET');
    })
    test('when option is not null then format option', async () => {
        const proxy = {
            request: option => option.success(option)
        };
        const httpEngine = new HttpEngine(proxy);
        const res = await httpEngine.request({
            method: 'post',
            headers: {
                k: 'v'
            }
        });

        expect(res.method).toBe('post');
        expect(res.header).toStrictEqual({
            k: 'v'
        });
    })
})
