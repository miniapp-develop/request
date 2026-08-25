// @mini-dev/request 微信示例 - 便捷层独立实例 & 两段式拦截器洋葱序
//
// createRequest() 造独立实例（不经 app.js 注册在默认单例上的全局拦截器）。
// 两段式拦截器按「后注册者在外层」对称嵌套：request 拦截器 unshift（后注册先跑）、response 拦截器 push（先注册先跑）。
// 成对注册 A、B 的执行序为：reqB → reqA → [核心链] → resA → resB（后注册的 B 作为外层，洋葱式后进先出）。
const { createRequest } = require('@mini-dev/request-wx');
const formatError = require('../../utils/formatError');

const BASE = 'http://127.0.0.1:8008';

const pageRequest = createRequest();
pageRequest.addRequestInterceptor((req) => {
    req.data = req.data || {};
    req.data.source = 'custom';
    return req;
});

Page({
    data: {
        result: '点击下方按钮（需先启动 sample-server）'
    },

    log(text) {
        console.log(text);
        this.setData({ result: text });
    },

    // 独立实例基础用法
    onTapBasic() {
        this.log('独立实例请求中…');
        pageRequest({ url: `${BASE}/get?urlname=urlget`, data: { name: 'get name' } })
            .then((res) => this.log(`独立实例: ${res.statusCode}\n${JSON.stringify(res.data, null, 2)}`))
            .catch((err) => this.log(`独立实例失败: ${formatError(err)}`));
    },

    // 拦截器洋葱序：注册 A、B 两对，打印 reqB→reqA→[核心]→resA→resB
    onTapOrder() {
        const r = createRequest();
        const order = [];
        r.addRequestInterceptor((req) => { order.push('reqA'); return req; })
            .addRequestInterceptor((req) => { order.push('reqB'); return req; });
        r.addResponseInterceptor((res) => { order.push('resA'); return res; })
            .addResponseInterceptor((res) => { order.push('resB'); return res; });
        this.log('拦截器洋葱序演示：注册顺序 A→B，观察执行序…');
        r({ url: `${BASE}/get`, method: 'GET' })
            .then(() => this.log(`执行序:\n${order.join(' → ')}\n（reqB 先 / resB 后 = 后注册者作为外层）`))
            .catch((err) => this.log(`演示失败: ${formatError(err)}`));
    }
});
