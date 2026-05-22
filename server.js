const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const HTML_FILE = path.join(__dirname, 'futurematch-likviditet.html');
const PASSWORD  = process.env.APP_PASSWORD || '';   // sættes som env-variabel på Railway

// ── Simpel HTTP Basic Auth ─────────────────────────────────
function checkAuth(req, res) {
  if (!PASSWORD) return true;                        // ingen kode sat → åben (kun lokalt)
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Basic ')) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Futurematch"' });
    res.end('Login krævet');
    return false;
  }
  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const pass = decoded.split(':').slice(1).join(':'); // alt efter første ":"
  if (pass !== PASSWORD) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Futurematch"' });
    res.end('Forkert adgangskode');
    return false;
  }
  return true;
}

// ── Server ─────────────────────────────────────────────────
const server = http.createServer((req, res) => {
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
      const data = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : '{}';
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
    req.on('end', () => {
      try {
        JSON.parse(body); // validér JSON
        fs.writeFileSync(DATA_FILE, body, 'utf8');
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
});
