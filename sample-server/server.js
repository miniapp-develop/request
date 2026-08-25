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

// 返回指定 HTTP 状态码（不抛错）：演示「库不把 HTTP 状态码当错误」——
// 非 2xx 仍走 success 回调，statusCode 原样透传到 Response，需消费方自行判断。
// 用法：GET /status/500、GET /status/503?retry=1
server.get('/status/:code', (req, res) => {
    const code = Number(req.params.code) || 200;
    res.status(code).json({
        args: req.query,
        headers: req.headers,
        url: req.originalUrl,
        statusCode: code
    });
});

// 立即销毁连接，让客户端拿到原生网络错误（TCP reset → 瞬态错误）。
// 用于演示 retry（瞬态原生错误才重试）与「原生错误原样透传」——比连不可达端口更确定，
// 且复用已信任的 127.0.0.1:8008 域，不受开发工具「不校验合法域名」开关影响。
server.get('/reset', (req, res) => {
    res.socket.destroy();
});

// 永不返回的 SSE 流：用于演示重试/超时（配合 ext.timeout / ext.retry）。
server.get('/stream-timeout', (req, res) => {});

// 与 /stream-with-header 同形，但末尾不写 `data: Finished` 也不 res.end，
// 流持续挂起不结束：用于演示「流中途 abort」或手动观察挂起行为。
server.get('/stream-hang-up', (req, res) => {
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

server.listen(8008, () => {
    console.log('Server started on port 8008');
});
