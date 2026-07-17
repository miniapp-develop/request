import request from '../../app.request';

Page({
    onLoad(query) {},
    onTap(e) {
        const method = e.currentTarget.dataset.method;
        if (method === 'GET') {
            request({
                url: 'http://127.0.0.1:3000/get?urlname=urlget',
                data: {
                    name: 'get name'
                }
            })
                .then((res) => {
                    console.log(res);
                    console.log('data', res.data);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'GET WITH PARAMS') {
            request({
                url: 'http://127.0.0.1:3000/get?urlname=urlget',
                params: {
                    name: 'get_params_name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'POST') {
            request({
                url: 'http://127.0.0.1:3000/post?urlname=urlpost',
                method: 'post',
                data: {
                    name: 'post_data_name'
                },
                params: {
                    name: 'params_data_name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'DELETE') {
            request({
                url: 'http://127.0.0.1:3000/delete?urlname=urldelete',
                method: 'delete',
                data: {
                    name: 'delete name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'PUT') {
            request({
                url: 'http://127.0.0.1:3000/put?urlname=urlput',
                method: 'put',
                data: {
                    name: 'put name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'PATCH') {
            request({
                url: 'http://127.0.0.1:3000/patch?urlname=urlpatch',
                method: 'patch',
                data: {
                    name: 'patch name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'OPTIONS') {
            request({
                url: 'http://127.0.0.1:3000',
                method: 'OPTIONS',
                data: {
                    name: 'OPTIONS name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'HEAD') {
            request({
                url: 'http://127.0.0.1:3000',
                method: 'HEAD',
                data: {
                    name: 'HEAD name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'TRACE') {
            request({
                url: 'http://127.0.0.1:3000',
                method: 'TRACE',
                data: {
                    name: 'TRACE name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        } else if (method === 'CONNECT') {
            request({
                url: 'http://127.0.0.1:3000',
                method: 'CONNECT',
                data: {
                    name: 'CONNECT name'
                }
            })
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    }
});
