import request from '../../app.request';
import * as streams from './streams';

const pageRequest = request.create().addRequestInterceptor(req => {
    console.log(`[Page Streams] res = `, req);
    return req;
});

Page({
    onLoad(query) {
    },
    onTapStreamWithHeader(e) {
        streams.streamWithHeader(pageRequest);
    },
    onTapStreamWithoutHeader(e) {
        streams.streamWithoutHeader(pageRequest);
    },
    onTapStreamTimeout(e) {
        streams.streamTimeout(pageRequest);
    },
    onTapPlainText(e) {
        streams.requestPlainText(pageRequest);
    }
});
