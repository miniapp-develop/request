// @mini-dev/request 微信示例 - HTTP Methods & canonical headers
//
// 便捷层默认单例 request：原生入参归一（header/headers→canonical headers、params→data|url）、
// Promise 返回、库控制走 ext。本页演示各 HTTP 方法透传，以及 canonical headers 跨平台一致性。
// 所有结果同步落到 UI 结果区（不必开调试器）。
const { request } = require('@mini-dev/request-wx');
const formatError = require('../../utils/formatError');

const BASE = 'http://127.0.0.1:8008';

Page({
    data: {
        result: '点击下方按钮发起请求（需先启动 sample-server：pnpm --filter sample-server run dev）'
    },

    log(text) {
        console.log(text);
        this.setData({ result: text });
    },

    onTap(e) {
        const method = e.currentTarget.dataset.method;
        if (method === 'CANONICAL') {
            this.onCanonical();
            return;
        }
        this.runMethod(method);
    },

    runMethod(method) {
        const upper = method.toUpperCase();
        const opt = { method };
        if (upper === 'GET') {
            opt.url = `${BASE}/get?urlname=urlget`;
            opt.data = { name: 'get name' };
        } else if (upper === 'GET WITH PARAMS') {
            opt.url = `${BASE}/get?urlname=urlget`;
            opt.params = { name: 'get_params_name' };
        } else if (['OPTIONS', 'HEAD', 'TRACE', 'CONNECT'].includes(upper)) {
            opt.url = BASE;
        } else {
            opt.url = `${BASE}/${upper.toLowerCase()}`;
            opt.data = { name: `${upper} name` };
            opt.params = { name: 'params_data_name' };
        }
        this.log(`${upper} 请求中…`);
        request(opt)
            .then((res) => {
                this.log(`${upper} ${res.statusCode}\n${JSON.stringify(res.data, null, 2)}`);
            })
            .catch((err) => {
                this.log(`${upper} 失败: ${formatError(err)}`);
            });
    },

    // canonical headers 跨平台一致性：便捷层把 header/headers 归一到 canonical 复数 headers，
    // engine 再映射到本平台原生字段（wx/tt→header、my→headers）。同一份 headers 写法三平台都能正确发出与读回。
    onCanonical() {
        this.log('canonical headers 演示：发送 X-Demo=wx，读回 res.headers…');
        request({
            url: `${BASE}/get`,
            method: 'GET',
            headers: { 'X-Demo': 'wx' },
            params: { from: 'canonical' }
        })
            .then((res) => {
                const echoed = res.data && res.data.headers ? res.data.headers['x-demo'] : undefined;
                this.log(
                    `statusCode: ${res.statusCode}\n` +
                    `res.headers: ${JSON.stringify(res.headers)}\n` +
                    `服务端回显收到的 X-Demo: ${echoed}\n` +
                    `（canonical 复数 headers → wx 原生 header，引擎自动映射）`
                );
            })
            .catch((err) => {
                this.log(`canonical 演示失败: ${formatError(err)}`);
            });
    }
});
