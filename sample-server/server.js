const express = require('express');
const server = express();
const INTERVAL = 500;

server.get('/', (req, res) => {
    res.send('Hello World!');
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
