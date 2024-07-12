import request from '../../app.request';
import * as streams from './streams';

const pageRequest = request.create().addRequestInterceptor(req => {
    console.log(`[Page Streams] req = `, req);
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
    onTapPlainTextWithHeader(e) {
        streams.plainTextWithHeader(pageRequest);
    },
    onTapPlainTextWithoutHeader(e) {
        streams.plainTextWithoutHeader(pageRequest);
    }
});
