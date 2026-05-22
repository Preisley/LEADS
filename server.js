const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const HTML_FILE = path.join(__dirname, 'futurematch-likviditet.html');
const PASSWORD  = process.env.APP_PASSWORD || '';

// ── Upstash Redis (persistent database) ───────────────────
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL   || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_KEY   = 'futurematch-data';

async function dbGet() {
  if (REDIS_URL) {
    try {
      const r = await fetch(`${REDIS_URL}/get/${REDIS_KEY}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      const j = await r.json();
      return j.result ? j.result : '{}';
    } catch (e) {}
  }
  // Fallback til fil
  try { return fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : '{}'; } catch { return '{}'; }
}

async function dbSet(body) {
  if (REDIS_URL) {
    try {
      await fetch(`${REDIS_URL}/set/${REDIS_KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([REDIS_KEY, body])
      });
      return;
    } catch (e) {}
  }
  // Fallback til fil
  fs.writeFileSync(DATA_FILE, body, 'utf8');
}

// ── Simpel HTTP Basic Auth ─────────────────────────────────
function checkAuth(req, res) {
  if (!PASSWORD) return true;
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Basic ')) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Futurematch"' });
    res.end('Login krævet');
    return false;
  }
  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const pass = decoded.split(':').slice(1).join(':');
  if (pass !== PASSWORD) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Futurematch"' });
    res.end('Forkert adgangskode');
    return false;
  }
  return true;
}

// ── Server ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (!checkAuth(req, res)) return;

  // ── Vis HTML ──
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(HTML_FILE, (err, data) => {
      if (err) { res.writeHead(500); res.end('Fejl ved indlæsning af HTML'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });

  // ── Hent data ──
  } else if (req.method === 'GET' && req.url === '/api/data') {
    try {
      const data = await dbGet();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); }

  // ── Gem data ──
  } else if (req.method === 'POST' && req.url === '/api/data') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) { res.writeHead(413); res.end('For stor'); req.destroy(); }
    });
    req.on('end', async () => {
      try {
        JSON.parse(body); // validér JSON
        await dbSet(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch { res.writeHead(400); res.end('Ugyldig JSON'); }
    });

  } else {
    res.writeHead(404); res.end('Ikke fundet');
  }
});

server.listen(PORT, () => {
  console.log(`✓ Futurematch kører på http://localhost:${PORT}`);
  console.log(PASSWORD ? '🔒 Adgangskodebeskyttelse aktiv' : '⚠️  Ingen adgangskode (APP_PASSWORD ikke sat)');
  console.log(REDIS_URL ? '🗄️  Upstash Redis database aktiv' : '📁 Bruger fil-storage (data.json)');
});
