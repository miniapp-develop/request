import request from '../../app.request';

const pageRequest = request.create();
pageRequest.addRequestInterceptor(req => {
    req.data.source = 'custom';
    return req;
});

Page({
    onLoad(query) {
    },
    onTap() {
        pageRequest({
            url: 'http://127.0.0.1:3000/get?urlname=urlget',
            data: {
                name: 'get name'
            }
        })
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.error(err);
            });
    }
});
