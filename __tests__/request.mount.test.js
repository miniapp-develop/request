const request = require('../libs').request;
const HttpEngines = require('./HttpEngine.setup');

describe('request.mount', () => {
    test('mount to host', async () => {
        const host = {};
        theNewRequest = request.create();

        theNewRequest.mount(host);

        expect(host.request).toBe(theNewRequest);
    });
    test('mount to host with name', async () => {
        const host = {};
        theNewRequest = request.create();

        theNewRequest.mount(host, 'proRequest');

        expect(host.request).toBeUndefined;
        expect(host.proRequest).toBe(theNewRequest);
    });
    test('mount to vendor with default name', async () => {
        const [vendor, httpEngine] = HttpEngines.createTestVendorHttpEngine();
        const theVendorReuqest = vendor.request;
        const theNewRequest = request.create(httpEngine);

        theNewRequest.mount(vendor);

        expect(vendor.request).toBe(theNewRequest);
        expect(vendor.request).not.toBe(theVendorReuqest);
    });
    test('mount to vendor with default name then delegate to vendor request', async () => {
        const [vendor, httpEngine] = HttpEngines.createTestVendorHttpEngine();
        const theVendorReuqest = vendor.request;
        const theNewRequest = request.create(httpEngine);

        theNewRequest.mount(vendor);
        await vendor.request();

        expect(theVendorReuqest).toHaveBeenCalledTimes(1);
    });
    test('mount to vendor with name', async () => {
        const [vendor, httpEngine] = HttpEngines.createTestVendorHttpEngine();
        const theVendorReuqest = vendor.request;
        const theNewRequest = request.create(httpEngine);

        theNewRequest.mount(vendor, 'proRequest');

        expect(vendor.request).toBe(theVendorReuqest);
        expect(vendor.request).not.toBe(theNewRequest);
        expect(vendor.proRequest).toBe(theNewRequest);
        expect(vendor.proRequest).not.toBe(theVendorReuqest);
    });
    test('mount to vendor with name then delegate to vendor request', async () => {
        const [vendor, httpEngine] = HttpEngines.createTestVendorHttpEngine();
        const theVendorReuqest = vendor.request;
        const theNewRequest = request.create(httpEngine);

        theNewRequest.mount(vendor, 'proRequest');
        await vendor.proRequest();

        expect(theVendorReuqest).toHaveBeenCalledTimes(1);
    });
});
