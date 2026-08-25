Page({
    onTap(e) {
        const method = e.currentTarget.dataset.method;
        const map = {
            methods: '/pages/methods/index',
            control: '/pages/control/index',
            stream: '/pages/stream/index',
            custom: '/pages/custom/index',
            'method-mw': '/pages/method-mw/index'
        };
        if (map[method]) {
            wx.navigateTo({ url: map[method] });
        }
    }
});
