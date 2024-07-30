const VendorHttpEngine = require('../libs/VendorHttpEngine');
const HttpEngine = require('../libs/HttpEngine');

class TestHttpEngine extends HttpEngine {
    constructor(preset, inspect) {
        super(...arguments);
        this._inspect = inspect;
    }

    _handleRequest(option) {
        return this._inspect(option);
    }
}

function createTestVendor() {
    const request = jest.fn().mockImplementation((option) => {
        if (option.enableChunked) {
            return {
                onHeadersReceived(callback) {
                    callback({ statusCode: 200, headers: { from: 'test' } });
                },
                onChunkReceived(callback) {
                    callback({ data: 'test' });
                }
            };
        } else {
            option.success({ data: 'test' });
            return {
                onHeadersReceived(callback) {},
                onChunkReceived(callback) {}
            };
        }
    });
    return {
        request: request
    };
}

function createTestHttpEngine() {
    const inspect = jest.fn().mockResolvedValue({});
    const httpEngine = new TestHttpEngine({}, inspect);
    return [inspect, httpEngine];
}

function createTestVendorHttpEngine() {
    const vendor = createTestVendor();
    const httpEngine = new VendorHttpEngine(vendor);
    return [vendor, httpEngine];
}

exports.createTestHttpEngine = createTestHttpEngine;
exports.createTestVendorHttpEngine = createTestVendorHttpEngine;
