const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3000;
const OPENSKY_API = 'https://opensky-network.org/api';
const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

// Load credentials
let clientId = null;
let clientSecret = null;
try {
  const creds = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
  clientId = creds.clientId;
  clientSecret = creds.clientSecret;
  console.log('Credentials loaded');
} catch (e) {
  console.warn('No credentials.json found — route lookups will fail');
}

// OAuth2 token management
let accessToken = null;
let tokenExpiry = 0;

function getToken() {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpiry) {
      return resolve(accessToken);
    }
    if (!clientId) return reject(new Error('No credentials'));

    const body = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const url = new URL(TOKEN_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`[token] ${res.statusCode}: ${data}`);
          return reject(new Error(`Token request failed: ${res.statusCode}`));
        }
        const json = JSON.parse(data);
        accessToken = json.access_token;
        tokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
        console.log(`[token] acquired, expires in ${json.expires_in}s`);
        resolve(accessToken);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Proxy: GET /api/origin?icao24=XXXX
// Calls OpenSky /flights/aircraft to find departure airport
function proxyOrigin(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const icao24 = url.searchParams.get('icao24');
  if (!icao24) {
    res.writeHead(400, corsJson());
    res.end(JSON.stringify({ error: 'icao24 required' }));
    return;
  }

  getToken().then(token => {
    const now = Math.floor(Date.now() / 1000);
    const begin = now - 12 * 3600; // last 12 hours
    const target = `${OPENSKY_API}/flights/aircraft?icao24=${encodeURIComponent(icao24.toLowerCase())}&begin=${begin}&end=${now}`;

    console.log(`[proxy] ${icao24} → ${target}`);

    https.get(target, {
      headers: { 'Authorization': `Bearer ${token}` },
    }, (upstream) => {
      let body = '';
      upstream.on('data', chunk => body += chunk);
      upstream.on('end', () => {
        console.log(`[proxy] ${icao24} ← ${upstream.statusCode} (${body.length}b)`);
        if (upstream.statusCode !== 200) {
          res.writeHead(upstream.statusCode, corsJson());
          res.end(body);
          return;
        }
        try {
          const flights = JSON.parse(body);
          // Find the most recent flight with a departure airport
          let origin = null;
          if (Array.isArray(flights)) {
            // Sort by lastSeen descending to get most recent
            flights.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
            for (const f of flights) {
              if (f.estDepartureAirport) {
                origin = f.estDepartureAirport;
                break;
              }
            }
          }
          console.log(`[proxy] ${icao24} origin: ${origin || 'unknown'}`);
          res.writeHead(200, corsJson());
          res.end(JSON.stringify({ icao24, origin }));
        } catch (e) {
          res.writeHead(500, corsJson());
          res.end(JSON.stringify({ error: 'parse error' }));
        }
      });
    }).on('error', (e) => {
      console.error(`[proxy] ${icao24} error:`, e.message);
      res.writeHead(502, corsJson());
      res.end(JSON.stringify({ error: e.message }));
    });
  }).catch(e => {
    console.error(`[proxy] token error:`, e.message);
    res.writeHead(500, corsJson());
    res.end(JSON.stringify({ error: 'auth failed: ' + e.message }));
  });
}

// Proxy: GET /api/states?lamin=...&lamax=...&lomin=...&lomax=...
// Forwards to OpenSky /states/all with auth for better rate limits
function proxyStates(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const qs = url.search; // pass through all query params

  getToken().then(token => {
    const target = `${OPENSKY_API}/states/all${qs}`;

    https.get(target, {
      headers: { 'Authorization': `Bearer ${token}` },
    }, (upstream) => {
      let body = '';
      upstream.on('data', chunk => body += chunk);
      upstream.on('end', () => {
        const remaining = upstream.headers['x-rate-limit-remaining'];
        if (remaining) console.log(`[states] credits remaining: ${remaining}`);
        res.writeHead(upstream.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(body);
      });
    }).on('error', (e) => {
      console.error(`[states] error:`, e.message);
      res.writeHead(502, corsJson());
      res.end(JSON.stringify({ error: e.message }));
    });
  }).catch(e => {
    console.error(`[states] token error:`, e.message);
    res.writeHead(500, corsJson());
    res.end(JSON.stringify({ error: 'auth failed' }));
  });
}

function corsJson() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const fullPath = path.join(__dirname, filePath);
  if (!fullPath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }

  const ext = path.extname(fullPath);
  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/states')) {
    proxyStates(req, res);
  } else if (req.url.startsWith('/api/origin')) {
    proxyOrigin(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`SkySpotter running at http://localhost:${PORT}`);
});
