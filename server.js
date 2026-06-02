const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const HTML_FILE = path.join(__dirname, 'futurematch-likviditet.html');
const USERNAME  = (process.env.APP_USERNAME || '').trim();
const PASSWORD  = (process.env.APP_PASSWORD || '').trim();
const SECRET    = process.env.SESSION_SECRET || (USERNAME + ':' + PASSWORD + ':fm-session-v1');

// ── Upstash Redis (persistent database) ───────────────────
const REDIS_URL   = (process.env.UPSTASH_REDIS_REST_URL   || '').trim();
const REDIS_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
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
  fs.writeFileSync(DATA_FILE, body, 'utf8');
}

// ── Auth (cookie-based med fallback til Basic Auth) ────────
function sessionToken() {
  return crypto.createHmac('sha256', SECRET).update(USERNAME + ':' + PASSWORD).digest('hex');
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = c.slice(i + 1).trim();
  });
  return out;
}

function isLoggedIn(req) {
  if (!PASSWORD) return true;
  // 1. Cookie-baseret session
  const cookies = parseCookies(req.headers.cookie);
  if (cookies['fm_session'] === sessionToken()) return true;
  // 2. HTTP Basic Auth fallback
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString();
      const idx = decoded.indexOf(':');
      const user = idx >= 0 ? decoded.slice(0, idx).trim() : '';
      const pass = idx >= 0 ? decoded.slice(idx + 1).trim() : '';
      if ((!USERNAME || user === USERNAME) && pass === PASSWORD) return true;
    } catch (e) {}
  }
  return false;
}

function renderLoginPage(errorMsg) {
  const errHtml = errorMsg
    ? `<div class="err">⚠️ ${errorMsg}</div>`
    : '';
  return `<!doctype html>
<html lang="da"><head><meta charset="utf-8">
<title>Log ind — Futurematch</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'DM Sans',sans-serif;background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:20px}
.card{background:#fff;padding:36px 32px;border-radius:18px;box-shadow:0 25px 70px rgba(0,0,0,.3);max-width:380px;width:100%}
h1{font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px}
.sub{font-size:13px;color:#64748b;margin-bottom:24px}
label{display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
.field{margin-bottom:14px}
.input-wrap{position:relative}
input{width:100%;padding:11px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px;outline:none;color:#0f172a;font-family:inherit;transition:border-color .15s,box-shadow .15s;background:#fff}
input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
input.pwd{padding-right:48px}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;padding:8px 10px;border-radius:8px;line-height:1}
.eye:hover{background:#f1f5f9;color:#0f172a}
button[type=submit]{width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;transition:background .15s;font-family:inherit}
button[type=submit]:hover{background:#1d4ed8}
.err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:11px 14px;border-radius:10px;font-size:13px;margin-bottom:14px;font-weight:500}
.brand{font-size:11px;color:#94a3b8;text-align:center;margin-top:18px;letter-spacing:.08em;font-weight:600}
</style></head>
<body>
<form class="card" method="POST" action="/login">
  <h1>🔐 Futurematch</h1>
  <div class="sub">Log ind for at fortsætte</div>
  ${errHtml}
  <div class="field">
    <label for="u">Brugernavn</label>
    <input type="text" id="u" name="username" autocomplete="username" required autofocus>
  </div>
  <div class="field">
    <label for="p">Adgangskode</label>
    <div class="input-wrap">
      <input type="password" id="p" name="password" class="pwd" autocomplete="current-password" required>
      <button type="button" class="eye" id="eye-btn" onclick="togglePwd()" title="Vis/skjul adgangskode">👁</button>
    </div>
  </div>
  <button type="submit">Log ind</button>
  <div class="brand">FUTUREMATCH</div>
</form>
<script>
function togglePwd(){
  var i=document.getElementById('p');
  var b=document.getElementById('eye-btn');
  if(i.type==='password'){i.type='text';b.textContent='🙈';}
  else{i.type='password';b.textContent='👁';}
}
</script>
</body></html>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1024 * 64) { reject(new Error('body too large')); req.destroy(); }});
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseFormBody(body) {
  const out = {};
  body.split('&').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) {
      const k = decodeURIComponent(p.slice(0, i).replace(/\+/g, ' '));
      const v = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' '));
      out[k] = v;
    }
  });
  return out;
}

// ── Server ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── Login routes ──
  if (req.url === '/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderLoginPage());
    return;
  }
  if (req.url === '/login' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const form = parseFormBody(body);
      const u = (form.username || '').trim();
      const p = (form.password || '').trim();
      if ((!USERNAME || u === USERNAME) && p === PASSWORD && PASSWORD) {
        // Set cookie — 30 days
        const cookie = `fm_session=${sessionToken()}; Path=/; Max-Age=${60*60*24*30}; HttpOnly; SameSite=Lax`;
        res.writeHead(302, { 'Set-Cookie': cookie, Location: '/' });
        res.end();
      } else {
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderLoginPage('Forkert brugernavn eller adgangskode'));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderLoginPage('Login fejlede — prøv igen'));
    }
    return;
  }
  if (req.url === '/logout') {
    res.writeHead(302, { 'Set-Cookie': 'fm_session=; Path=/; Max-Age=0', Location: '/login' });
    res.end();
    return;
  }

  // ── Auth check ──
  if (!isLoggedIn(req)) {
    if (req.url.startsWith('/api/')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end('{"error":"unauthorized"}');
      return;
    }
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

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
        JSON.parse(body);
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
  console.log(PASSWORD ? `🔒 Login aktiv (brugernavn: ${USERNAME || 'fri'} · kode sat)` : '⚠️  Ingen adgangskode (APP_PASSWORD ikke sat)');
  console.log(REDIS_URL ? '🗄️  Upstash Redis database aktiv' : '📁 Bruger fil-storage (data.json)');
});
