import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/editor.css', ['editor.css','text/css']], ['/editor.mjs', ['editor.mjs','text/javascript']],
  ['/lib/layout.css',['lib/layout.css','text/css']],
  ...['index','editing','highlight','layout','preview'].map(name => ['/lib/'+name+'.mjs',['lib/'+name+'.mjs','text/javascript']]),
  ['/marked.mjs', ['node_modules/marked/lib/marked.esm.js','text/javascript']],
  ['/purify.mjs', ['node_modules/dompurify/dist/purify.es.mjs','text/javascript']]
]);
const server = createServer(async (request, response) => {
  const entry = files.get(request.url);
  if (request.method !== 'GET' || !entry) { response.writeHead(404).end(); return; }
  try {
    const bytes = await readFile(new URL(entry[0], import.meta.url));
    response.writeHead(200, {'Content-Type': entry[1], 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; base-uri 'none'; frame-ancestors 'none'"});
    response.end(bytes);
  } catch { response.writeHead(500).end(); }
});
server.listen(Number(process.env.MIAOYAN_PORT || 4173), '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + server.address().port;
  console.log(url);
  if (process.platform === 'win32' && !process.argv.includes('--no-open')) {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore', windowsHide: true });
    browser.on('error', error => console.error(error.message));
    browser.unref();
  }
});
