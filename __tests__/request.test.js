describe('default exported', () => {
    beforeEach(() => {
        jest.resetModules();
        global.wx = undefined;
    })
    test('when wx is null then httpEngine is null', () => {
        const request = require('../libs').request;

        expect(request.engine).toBeNull();
    })
    test('when wx is not null then httpEngine is not null', () => {
        global.wx = {};
        const request = require('../libs').request;

        expect(request.engine).not.toBeNull();
    })
})

describe('create', () => {
    beforeEach(() => {
        jest.resetModules();
        global.wx = undefined;
    })
    test('when create with default and wx is null then httpEngine is null', () => {
        const request = require('../libs').request.create();

        expect(request.engine).toBeNull();
    })
    test('when create with default and wx is not null then httpEngine is not null', () => {
        global.wx = {};
        const request = require('../libs').request.create();

        expect(request.engine).not.toBeNull();
    })
    test('when create with custom httpEngine then use the custom httpEngine', () => {
        const mockHttpEngine = jest.fn();
        const libs = require('../libs');
        const request = libs.request.create(mockHttpEngine);

        expect(request.engine).toBe(mockHttpEngine);
    })
})

describe('interceptor', () => {
    beforeEach(() => {
        jest.resetModules();
    })
    const createRequest = elements => {
        const libs = require('../libs');
        const mockHttpEngine = {
            request(options) {
                elements.push('handle')
                return Promise.resolve({});
            }
        }
        const request = libs.request.create(mockHttpEngine);
        request
            .addRequestInterceptor(req => {
                elements.push('req');
            })
            .addResponseInterceptor(res => {
                elements.push('res');
            });
        return request;
    }

    test('when has request interceptor then invoke request interceptor before handle', async () => {
        let callElements = [];
        const request = createRequest(callElements);
        await request({});

        expect(callElements).toEqual(['req', 'handle', 'res'])
    })

    describe('when has multi interceptor', () => {
        const createRequest = (reqElements, resElements) => {
            const libs = require('../libs');
            const mockHttpEngine = {
                request(options) {
                    return Promise.resolve({});
                }
            }
            const request = libs.request.create(mockHttpEngine);
            request
                .addRequestInterceptor(req => {
                    reqElements.push('req.1');
                })
                .addRequestInterceptor(req => {
                    reqElements.push('req.2');
                })
                .addResponseInterceptor(res => {
                    resElements.push('res.1');
                })
                .addResponseInterceptor(res => {
                    resElements.push('res.2');
                });
            return request;
        }
        test('request interceptors invoke in reversed-added-order', async () => {
            let reqElements = [];
            const request = createRequest(reqElements, []);
            await request({});

            expect(reqElements).toEqual(['req.2', 'req.1'])
        })
        test('response interceptors invoke in added-order', async () => {
            let resElements = [];
            const request = createRequest([], resElements);
            await request({});

            expect(resElements).toEqual(['res.1', 'res.2'])
        })
    })
})