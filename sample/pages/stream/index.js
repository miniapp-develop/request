import request from '../../app.request';
import { requestStream, requestStreamTimeout } from './streams';

Page({
    onLoad(query) {
    },
    onTapStream(e) {
        requestStream(request);
    },
    onTapStreamTimeout(e) {
        requestStreamTimeout(request);
    }
});
