// 手动验证 sample-server 流式端点的小脚本：node client.js（需先 npm run dev 启动 server）
const axios = require('axios');

axios.get('http://127.0.0.1:8008/stream-with-header', {
    responseType: 'stream'
}).then((response) => {
    console.log('headers', response.headers);
    response.data.on('data', (chunk) => {
        console.log('chunk:', chunk.toString());
    });
    response.data.on('end', () => {
        console.log('end');
    });
}).catch((error) => {
    console.error('Error:', error.message);
});
