// 本地运行课程：node server.js [端口]
// 1. 提供课程页面和静态文件。
// 2. 用 Node 自带的 SQLite（node:sqlite，需要 Node 22.13 或更高版本）保存学习进度：
//    GET /api/progress 读取，PUT /api/progress 写入。数据库文件是 data/progress.db。
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname, PORT = +process.argv[2] || +process.env.PORT || 8080;
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'progress.db'));
db.exec(`CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);
const getRow = db.prepare('SELECT body FROM progress WHERE id = ?');
const putRow = db.prepare(`INSERT INTO progress (id, body, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`);
const USER = 'local';   // 单用户。需要多用户时，在这里按登录用户区分

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8' };
const send = (res, code, body, type = 'application/json; charset=utf-8') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/progress') {
    if (req.method === 'GET') {
      const row = getRow.get(USER);
      return send(res, 200, row ? row.body : 'null');
    }
    if (req.method === 'PUT') {
      let buf = '';
      req.on('data', c => { buf += c; if (buf.length > 5e6) req.destroy(); });
      req.on('end', () => {
        try { JSON.parse(buf); } catch (e) { return send(res, 400, '{"error":"bad json"}'); }
        putRow.run(USER, buf, Date.now());
        send(res, 204, '');
      });
      return;
    }
    return send(res, 405, '{"error":"method"}');
  }
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT) || /[\\/](data|node_modules)([\\/]|$)/.test(file.slice(ROOT.length))) return send(res, 403, 'forbidden', 'text/plain');
  if (url.pathname === '/') file = path.join(ROOT, 'vue3-course.html');
  fs.readFile(file, (err, buf) => err ? send(res, 404, 'not found', 'text/plain') : send(res, 200, buf, TYPES[path.extname(file)] || 'application/octet-stream'));
}).listen(PORT, '127.0.0.1', () => console.log('课程地址：http://localhost:' + PORT + '/'));
