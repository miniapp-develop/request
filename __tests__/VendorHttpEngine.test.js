const VendorHttpEngine = require('../libs/VendorHttpEngine');

describe('VendorHttpEngine', () => {
    const createHttpEngine = (callback) => {
        return new VendorHttpEngine({
            request: (option) => {
                callback(option);
                option.success({});
            }
        });
    };
    test('when method is GET then don not change url', async () => {
        const mockRequest = jest.fn().mockReturnValue({});
        const httpEngine = createHttpEngine(mockRequest);
        await httpEngine.request({
            url: 'https://x.y.z',
            method: 'GET',
            params: {
                a: 100
            }
        });

        expect(mockRequest.mock.calls[0][0].url).toEqual('https://x.y.z');
    });
    test.each(['POST', 'DELETE', 'PUT', 'PATCH'])('when method is not GET then add params to url', async (method) => {
        const mockRequest = jest.fn().mockReturnValue({});
        const httpEngine = createHttpEngine(mockRequest);
        await httpEngine.request({
            url: 'https://x.y.z',
            method: method,
            params: {
                a: 100
            }
        });

        expect(mockRequest.mock.calls[0][0].url).toEqual('https://x.y.z?a=100');
    });
});
