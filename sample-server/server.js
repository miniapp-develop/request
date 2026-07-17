const express = require('express');
const server = express();
const INTERVAL = 500;

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.get('/', (req, res) => {
    res.send('Hello World!');
});

function echo(req, res) {
    res.json({
        args: req.query,
        data: req.body,
        headers: req.headers,
        method: req.method,
        url: req.originalUrl
    });
}

// 模拟 httpbin.org 的 /get /post /put /patch /delete 等回显接口，
// 以及 OPTIONS/HEAD/TRACE/CONNECT 等在根路径上的回显（GET / 仍走上面的 Hello World）
server.all('/', echo);
server.all('/get', echo);
server.all('/post', echo);
server.all('/put', echo);
server.all('/patch', echo);
server.all('/delete', echo);

server.get('/delay/:seconds', (req, res) => {
    const seconds = Math.min(Number(req.params.seconds) || 0, 10);
    setTimeout(() => {
        res.json({
            args: req.query,
            headers: req.headers,
            url: req.originalUrl
        });
    }, seconds * 1000);
});

const messages = ['Hello', 'Are ', 'you Ok?'];

server.get('/plain-with-header', (req, res) => {
    res.setHeader('Transfer-Encoding', 'chunked');
    res.end('data: Hello\n\ndata: Are\n\ndata: you Ok?\n\ndata: Finished\n\n');
});

server.get('/plain-without-header', (req, res) => {
    res.end('data: Hello\n\ndata: Are\n\ndata: you Ok?\n\ndata: Finished\n\n');
});

server.get('/stream-with-header', (req, res) => {
    console.log('/stream');
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let count = 0;
    const timer = setInterval(() => {
        if (count === messages.length) {
            clearInterval(timer);
            res.end('data: Finished\n\n');
        } else {
            res.write(`data: ${messages[count]}\n\n`);
        }
        count++;
    }, INTERVAL);
});
server.get('/stream-without-header', (req, res) => {
    console.log('/stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let count = 0;
    const timer = setInterval(() => {
        if (count === messages.length) {
            clearInterval(timer);
            res.end('data: Finished\n\n');
        } else {
            res.write(`data: ${messages[count]}\n\n`);
        }
        count++;
    }, INTERVAL);
});

server.get('/stream-timeout', (req, res) => {});

server.get('/stream-hang-up', (req, res) => {
    console.log('/stream-timeout');
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let count = 0;
    const timer = setInterval(() => {
        if (count === messages.length) {
            clearInterval(timer);
        } else {
            res.write(`data: ${messages[count]}\n\n`);
        }
        count++;
    }, INTERVAL);
});

server.listen(3000, () => {
    console.log('Server started on port 3000');
});
