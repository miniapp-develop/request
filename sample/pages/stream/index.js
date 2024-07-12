import request from '../../app.request';
import * as streams from './streams';

Page({
    onLoad(query) {
    },
    onTapStreamWithHeader(e) {
        streams.streamWithHeader(request);
    },
    onTapStreamWithoutHeader(e) {
        streams.streamWithoutHeader(request);
    },
    onTapStreamTimeout(e) {
        streams.streamTimeout(request);
    },
    onTapPlainText(e) {
        streams.requestPlainText(request);
    }
});
