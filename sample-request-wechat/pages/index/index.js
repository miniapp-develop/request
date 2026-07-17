Page({
    onTap(e) {
        const method = e.currentTarget.dataset.method;
        if (method === 'methods') {
            wx.navigateTo({
                url: '/pages/methods/index'
            });
        } else if (method === 'control') {
            wx.navigateTo({
                url: '/pages/control/index'
            });
        } else if (method === 'stream') {
            wx.navigateTo({
                url: '/pages/stream/index'
            });
        } else if (method === 'mount') {
            wx.navigateTo({
                url: '/pages/mount/index'
            });
        } else if (method === 'custom') {
            wx.navigateTo({
                url: '/pages/custom/index'
            });
        }
    }
});
