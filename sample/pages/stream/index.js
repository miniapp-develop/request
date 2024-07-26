import * as streams from './streams';
Page({
    onLoad(query) {},
    onTapStreamWithHeader(e) {
        streams.streamWithHeader();
    },
    onTapStreamWithoutHeader(e) {
        streams.streamWithoutHeader();
    },
    onTapStreamTimeout(e) {
        streams.streamTimeout();
    },
    onTapPlainTextWithHeader(e) {
        streams.plainTextWithHeader();
    },
    onTapPlainTextWithoutHeader(e) {
        streams.plainTextWithoutHeader();
    },
    onTapStreamWithHeaderNoBuffer(e) {
        streams.plainTextWithoutHeaderNoBuffer();
    }
});
