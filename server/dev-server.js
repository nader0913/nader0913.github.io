#!/usr/bin/env node

/**
 * Local Development Server
 *
 * - Serves static files (HTML, CSS, JS)
 * - Proxies API requests to backend
 * - Supports subdomain simulation via localhost:8080 and user.localhost:8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const API_PORT = 3000;
const ROOT_DIR = path.join(__dirname, '..');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(content);
    }
  });
}

function proxyToAPI(req, res) {
  const options = {
    hostname: 'localhost',
    port: API_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxy = http.request(options, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error('❌ API Proxy Error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API server not available' }));
  });

  req.pipe(proxy);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const hostname = req.headers.host.split(':')[0];

  console.log(`${req.method} ${url.pathname} (Host: ${hostname})`);

  // Proxy API requests
  if (url.pathname.startsWith('/api/')) {
    return proxyToAPI(req, res);
  }

  // Determine which file to serve based on hostname and path
  let filePath;

  // Main domain (localhost or pluma.local)
  if (hostname === 'localhost' || hostname === 'pluma.local') {
    if (url.pathname === '/' || url.pathname === '') {
      filePath = path.join(ROOT_DIR, 'index.html');
    } else if (url.pathname === '/login.html' || url.pathname === '/login') {
      filePath = path.join(ROOT_DIR, 'login.html');
    } else {
      filePath = path.join(ROOT_DIR, url.pathname);
    }
  }
  // Subdomain (username.localhost or username.pluma.local)
  else if (hostname.endsWith('.localhost') || hostname.endsWith('.pluma.local')) {
    const username = hostname.split('.')[0];
    console.log(`📍 Subdomain detected: ${username}`);

    // Serve viewer page for subdomains
    if (url.pathname === '/' || url.pathname === '') {
      filePath = path.join(ROOT_DIR, 'viewer.html');
    } else if (url.pathname === '/builder.html' || url.pathname === '/builder') {
      filePath = path.join(ROOT_DIR, 'builder.html');
    } else {
      filePath = path.join(ROOT_DIR, url.pathname);
    }
  }
  // Unknown host
  else {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n🌐 Development Server running on http://localhost:${PORT}`);
  console.log(`\n📍 Available routes:`);
  console.log(`   http://localhost:${PORT}              → Landing page`);
  console.log(`   http://localhost:${PORT}/login.html   → Login/Signup`);
  console.log(`   http://username.localhost:${PORT}     → User's articles (subdomain)`);
  console.log(`\n💡 Make sure API server is running on port ${API_PORT}\n`);
});
