/** Servidor local só para conferir o site antes de publicar. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('site');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  // Sem isto o ícone sai como octet-stream e o navegador o ignora — o que dá a
  // impressão, ao conferir aqui, de que ele não funciona. Em produção o
  // GitHub Pages já manda o tipo certo.
  '.svg': 'image/svg+xml; charset=utf-8'
};

http.createServer((req, res) => {
  const nome = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
  const arquivo = path.join(RAIZ, nome);
  if (!arquivo.startsWith(RAIZ) || !fs.existsSync(arquivo)) { res.writeHead(404); return res.end('não encontrado'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(arquivo).pipe(res);
}).listen(8777, '127.0.0.1', () => console.log('http://127.0.0.1:8777'));
