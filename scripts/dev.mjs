import { spawnSync } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const portValue = process.env.PORT ?? '4173';
if (!/^\d+$/.test(portValue) || Number(portValue) < 1 || Number(portValue) > 65535) {
  console.error('PORT must be a numeric port between 1 and 65535.');
  process.exit(1);
}
const port = Number(portValue);

const build = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
if (build.error || build.status !== 0) {
  console.error(`Static build failed: ${build.error?.message || build.signal || build.status}.`);
  process.exit(1);
}

const publicRoot = await realpath(join(root, 'public'));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function isWithinPublic(path) {
  const location = relative(publicRoot, path);
  return !isAbsolute(location) && location !== '..' && !location.startsWith(`..${sep}`);
}

const server = createServer(async (request, response) => {
  function reply(status, message, headers = {}) {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    response.end(request.method === 'HEAD' ? undefined : `${message}\n`);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    reply(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent((request.url || '/').split(/[?#]/, 1)[0]);
  } catch {
    reply(400, 'Malformed URL');
    return;
  }
  if (!pathname.startsWith('/') || /[\\\0]/.test(pathname) || pathname.split('/').includes('..')) {
    reply(403, 'Forbidden');
    return;
  }

  try {
    let file = resolve(publicRoot, `.${pathname}`);
    if (!isWithinPublic(file) || !isWithinPublic(await realpath(file))) {
      reply(403, 'Forbidden');
      return;
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    file = await realpath(file);
    if (!isWithinPublic(file)) {
      reply(403, 'Forbidden');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      reply(404, 'Not found');
      return;
    }
    const body = request.method === 'HEAD' ? undefined : await readFile(file);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body ? body.length : info.size,
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EACCES', 'ELOOP'].includes(error.code)) {
      reply(404, 'Not found');
    } else {
      console.error(error);
      reply(500, 'Internal server error');
    }
  }
});

server.on('error', (error) => {
  console.error(`Dev server failed: ${error.message}`);
  process.exitCode = 1;
});

let closing = false;
function close() {
  if (closing) return;
  closing = true;
  server.close();
  server.closeIdleConnections();
}
process.on('SIGINT', close);
process.on('SIGTERM', close);

server.listen(port, '127.0.0.1', () => {
  console.log(`static frontend: http://127.0.0.1:${port}`);
});
