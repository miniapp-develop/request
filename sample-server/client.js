const axios = require('axios');

axios.get('http://127.0.0.1:3000/stream', {
    responseType: 'stream'
}).then(response => {
    console.log(response.data.headers);
    response.data.on('data', (chunk) => {
        console.log(chunk.toString());
    });
}).catch(error => {
    console.error('Error:', error);
});