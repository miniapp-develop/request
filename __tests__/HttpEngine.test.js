const HttpEngines = require('./HttpEngine.setup');

describe('HttpEngine', () => {
    beforeEach(() => {
    });
    test('when option.method is absent then use GET', async () => {
        const [inspect, httpEngine] = HttpEngines.createTestHttpEngine();

        await httpEngine.request({});
        expect(inspect).toBeCalledWith({ method: 'GET' });
    });
});
