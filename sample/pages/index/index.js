Page({
    onTap(e) {
        const method = e.currentTarget.dataset.method;
        if (method === 'Methods') {
            wx.navigateTo({
                url: '/pages/methods/index'
            });
        } else if (method === 'Exception') {
            wx.navigateTo({
                url: '/pages/exception/index'
            });
        } else if (method === 'Stream') {
            wx.navigateTo({
                url: '/pages/stream/index'
            });
        }
    }
});
