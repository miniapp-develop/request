const { request } = require('../../app.request');
import * as streams from './streams';

Page({
    onLoad(query) {
    },
    onTapStream(e) {
        streams.requestStream(request);
    },
    onTapStreamTimeout(e) {
        streams.requestStreamTimeout(request);
    }
});
