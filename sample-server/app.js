const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/stream', (req, res) => {
    console.log('/stream');
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
    let count = 0;
    const timer = setInterval(() => {
        res.write(`data: ${count}\n\n`);
        if (count === 3) {
            clearInterval(timer);
            res.end('data: Finished\n\n');
        }
        count++;
    }, 1000);
});

app.get('/stream-timeout', (req, res) => {
});
app.get('/stream-hang-up', (req, res) => {
    console.log('/stream-timeout');
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
    let count = 0;
    const timer = setInterval(() => {
        res.write(`data: ${count}\n\n`);
        if (count === 3) {
            clearInterval(timer);
        }
        count++;
    }, 1000);
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});