import * as streams from './streams';

Page({
    data: {
        result: '点击下方按钮发起流式请求（需先启动 sample-server）\nchunk 实时显示在下方结果区'
    },

    log(text) {
        console.log('[UI]', text);
        // 追加而非覆盖，让多个 chunk 在结果区累积可见（reset 已先清空）
        const prev = this.data.result;
        this.setData({ result: prev ? `${prev}\n${text}` : text });
    },

    reset() {
        this.setData({ result: '' });
    },

    onTapStreamWithHeader() { this.reset(); streams.streamWithHeader(this.log.bind(this)); },
    onTapStreamWithoutHeader() { this.reset(); streams.streamWithoutHeader(this.log.bind(this)); },
    onTapStreamTimeout() { this.reset(); streams.streamTimeout(this.log.bind(this)); },
    onTapPlainTextWithHeader() { this.reset(); streams.plainTextWithHeader(this.log.bind(this)); },
    onTapPlainTextWithoutHeader() { this.reset(); streams.plainTextWithoutHeader(this.log.bind(this)); },
    onTapStreamWithHeaderNoBuffer() { this.reset(); streams.streamWithHeaderNoBuffer(this.log.bind(this)); },
    onTapStreamThenAbort() { this.reset(); streams.streamThenAbort(this.log.bind(this)); }
});
