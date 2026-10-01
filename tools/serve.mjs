import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const option = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i+1]; };
const port = Number(option('--port', '4173'));
const host = option('--host', '127.0.0.1');
const base = '/' + option('--base-path', '').replace(/^\/+|\/+$/g, '');
const prefix = base === '/' ? '/' : base + '/';
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4'};
const server = http.createServer(async (req,res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (base !== '/' && pathname === base) { res.writeHead(302,{Location:prefix}).end(); return; }
    if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = pathname.slice(prefix.length) || 'index.html';
    // Serve only website files, never .git, tooling, or local dependencies.
    if (!/^(index\.html|styles\.css|app\.js|assets\/[^.].*|data\/results\.json)$/.test(relative) || relative.split('/').some(p=>p==='..'||p.startsWith('.'))) { res.writeHead(404).end(); return; }
    const resolved = await realpath(path.join(root,relative));
    if (!resolved.startsWith(root)) { res.writeHead(403).end(); return; }
    const info = await stat(resolved);
    if (!info.isFile()) { res.writeHead(404).end(); return; }
    const headers = {'Content-Type':types[path.extname(resolved)] || 'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
    let start = 0, end = info.size-1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1]&&!match[2])) { res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end(); return; }
      start = match[1] ? Number(match[1]) : Math.max(0,info.size-Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]),info.size-1) : info.size-1;
      if (start>end || start>=info.size) { res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end(); return; }
      status=206; headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);
    if(req.method==='HEAD') { res.end(); return; }
    const stream=createReadStream(resolved,{start,end});
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
server.listen(port,host,()=>console.log(`Preview server: http://${host}:${port}${prefix}`));
