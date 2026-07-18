const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.SYNC_TOKEN || '';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'state.json');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}
function authorized(req) {
  return !TOKEN || req.headers.authorization === `Bearer ${TOKEN}`;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.url === '/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, name: 'Urlaubsplaner Backend v0.9', time: new Date().toISOString() });
  }
  if (req.url === '/api/state') {
    if (!authorized(req)) return send(res, 401, { error: 'Nicht autorisiert' });
    if (req.method === 'GET') {
      if (!fs.existsSync(DATA_FILE)) return send(res, 404, { error: 'Noch kein Datenstand gespeichert' });
      try { return send(res, 200, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); }
      catch { return send(res, 500, { error: 'Datenstand ist beschädigt' }); }
    }
    if (req.method === 'PUT') {
      try {
        const payload = JSON.parse(await readBody(req));
        if (!payload || typeof payload.state !== 'object') return send(res, 400, { error: 'Ungültiger Datenstand' });
        const stored = { ...payload, updatedAt: new Date().toISOString(), revision: crypto.randomUUID() };
        const tmp = DATA_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(stored, null, 2));
        fs.renameSync(tmp, DATA_FILE);
        return send(res, 200, { ok: true, updatedAt: stored.updatedAt, revision: stored.revision });
      } catch (error) { return send(res, 400, { error: error.message }); }
    }
  }
  return send(res, 404, { error: 'Nicht gefunden' });
});
server.listen(PORT, () => console.log(`Urlaubsplaner Backend läuft auf Port ${PORT}`));
