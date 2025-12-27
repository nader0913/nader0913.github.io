#!/usr/bin/env node

/**
 * Local API Server with SQLite
 * For development/testing purposes only
 */

const http = require('http');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'local-dev-secret';
const DB_PATH = path.join(__dirname, 'local-dev.db');

// ===== DATABASE =====

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function initDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create articles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT,
      content TEXT NOT NULL,
      chapter TEXT,
      date TEXT,
      published INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Local SQLite database initialized');
}

// ===== UTILITIES =====

function generateToken(username) {
  const payload = JSON.stringify({ username, exp: Date.now() + 86400000 }); // 24h
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('base64');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

function verifyToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(payloadB64);
    const expectedSignature = hmac.digest('base64');

    console.log('🔍 Token verification:', {
      hasPayload: !!payloadB64,
      hasSignature: !!signature,
      signatureReceived: signature.substring(0, 20) + '...',
      signatureExpected: expectedSignature.substring(0, 20) + '...',
      signaturesMatch: signature === expectedSignature,
      isExpired: payload.exp < Date.now(),
      username: payload.username
    });

    if (signature !== expectedSignature) {
      console.log('❌ Signature mismatch');
      return null;
    }
    if (payload.exp < Date.now()) {
      console.log('❌ Token expired');
      return null;
    }

    return payload;
  } catch (err) {
    console.log('❌ Token verification error:', err.message);
    return null;
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// ===== DATABASE QUERIES =====

let getUserByUsername, createUserStmt, getArticlesByUsernameStmt;

function initStatements() {
  getUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
  createUserStmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
  getArticlesByUsernameStmt = db.prepare(`
    SELECT a.* FROM articles a
    JOIN users u ON a.user_id = u.id
    WHERE u.username = ?
    ORDER BY a.created_at DESC
  `);
}

function createUser(username, password, email) {
  const passwordHash = hashPassword(password);
  try {
    const result = createUserStmt.run(username, email, passwordHash);
    return getUserByUsername.get(username);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      throw new Error('Username already exists');
    }
    throw err;
  }
}

function getArticlesByUsername(username) {
  return getArticlesByUsernameStmt.all(username);
}

function saveArticle(username, article) {
  const user = getUserByUsername.get(username);
  if (!user) throw new Error('User not found');

  const { id, title, slug, content, chapter, date, published } = article;

  const stmt = db.prepare(`
    INSERT INTO articles (id, user_id, title, slug, content, chapter, date, published, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      slug = excluded.slug,
      content = excluded.content,
      chapter = excluded.chapter,
      date = excluded.date,
      published = excluded.published,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(id, user.id, title, slug || '', content || '', chapter || '', date || '', published ? 1 : 0);
  return db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
}

function deleteArticle(username, articleId) {
  const user = getUserByUsername.get(username);
  if (!user) throw new Error('User not found');

  db.prepare('DELETE FROM articles WHERE id = ? AND user_id = ?').run(articleId, user.id);
}

// ===== HTTP HELPERS =====

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendJSON(res, status, data, setCookie = null, origin = null) {
  // Allow any localhost subdomain
  const allowedOrigin = origin || 'http://localhost:8080';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (setCookie) {
    headers['Set-Cookie'] = setCookie;
  }

  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

function getAuthToken(req) {
  // Try to get token from cookie first (production way)
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    if (cookies.auth_token) {
      return cookies.auth_token;
    }
  }

  // Fallback to Authorization header for API calls
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.substring(7);
  }

  return null;
}

// ===== ROUTES =====

const routes = {
  async login(req, res, body) {
    const { username, password } = body;
    const origin = req.headers.origin;

    console.log('🔐 LOGIN ATTEMPT:', { username, hasPassword: !!password });

    if (!username || !password) {
      console.log('❌ Login failed: Missing credentials');
      return sendJSON(res, 400, { error: 'Username and password required' }, null, origin);
    }

    const user = getUserByUsername.get(username);
    if (!user) {
      console.log('❌ Login failed: User not found');
      return sendJSON(res, 401, { error: 'Invalid credentials' }, null, origin);
    }

    if (user.password_hash !== hashPassword(password)) {
      console.log('❌ Login failed: Wrong password');
      return sendJSON(res, 401, { error: 'Invalid credentials' }, null, origin);
    }

    const token = generateToken(username);
    console.log('✅ Login successful:', username);

    // Determine cookie domain based on request origin
    let cookie;
    if (origin && origin.includes('.local')) {
      // For pluma.local: Use proper cookie domain (simulates production)
      cookie = `auth_token=${token}; HttpOnly; Path=/; Domain=.pluma.local; SameSite=Lax; Max-Age=604800`;
      console.log('   Using cookie domain: .pluma.local (production mode)');
    } else {
      // For localhost: Set cookie without domain (will also send token in response for localStorage fallback)
      cookie = `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`;
      console.log('   Using localStorage mode (localhost)');
    }

    // Send token in response for localhost development (*.localhost subdomains share localStorage)
    // For pluma.local, the cookie will work properly so token in response is optional but harmless
    sendJSON(res, 200, { success: true, username, email: user.email, token }, cookie, origin);
  },

  async signup(req, res, body) {
    const { username, password, email } = body;
    const origin = req.headers.origin;

    console.log('📝 SIGNUP ATTEMPT:', { username, email, hasPassword: !!password });

    if (!username || !password) {
      console.log('❌ Signup failed: Missing credentials');
      return sendJSON(res, 400, { error: 'Username and password required' }, null, origin);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      console.log('❌ Signup failed: Invalid username format');
      return sendJSON(res, 400, { error: 'Invalid username format' }, null, origin);
    }

    try {
      const user = createUser(username, password, email);
      const token = generateToken(username);
      console.log('✅ Signup successful:', username);

      // Determine cookie domain based on request origin
      let cookie;
      if (origin && origin.includes('.local')) {
        // For pluma.local: Use proper cookie domain (simulates production)
        cookie = `auth_token=${token}; HttpOnly; Path=/; Domain=.pluma.local; SameSite=Lax; Max-Age=604800`;
        console.log('   Using cookie domain: .pluma.local (production mode)');
      } else {
        // For localhost: Set cookie without domain (will also send token in response for localStorage fallback)
        cookie = `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`;
        console.log('   Using localStorage mode (localhost)');
      }

      // Send token in response for localhost development
      sendJSON(res, 201, { success: true, username, email: user.email, token }, cookie, origin);
    } catch (err) {
      console.log('❌ Signup failed:', err.message);
      sendJSON(res, 409, { error: err.message }, null, origin);
    }
  },

  async logout(req, res) {
    const origin = req.headers.origin;
    console.log('👋 Logout request');

    // Clear the auth cookie with appropriate domain
    let cookie;
    if (origin && origin.includes('.local')) {
      // For pluma.local: Clear cookie with domain
      cookie = `auth_token=; HttpOnly; Path=/; Domain=.pluma.local; SameSite=Lax; Max-Age=0`;
      console.log('   Clearing cookie with domain: .pluma.local');
    } else {
      // For localhost: Clear cookie without domain
      cookie = `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
      console.log('   Clearing cookie (localhost mode)');
    }

    sendJSON(res, 200, { success: true }, cookie, origin);
  },

  async getArticles(req, res, username) {
    const origin = req.headers.origin;
    const user = getUserByUsername.get(username);
    if (!user) {
      return sendJSON(res, 404, { error: 'User not found' }, null, origin);
    }

    const rawArticles = getArticlesByUsername(username);

    // Transform articles to match expected format
    const articles = rawArticles.map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug || article.id,
      chapter: article.chapter,
      date: article.date,
      markdown: article.content,
      published: article.published === 1,
      timestamp: new Date(article.updated_at).getTime()
    }));

    sendJSON(res, 200, { articles }, null, origin);
  },

  async saveArticle(req, res, username, body) {
    const origin = req.headers.origin;
    const token = getAuthToken(req);
    const payload = verifyToken(token);

    console.log('💾 SAVE ARTICLE ATTEMPT:', {
      username,
      hasToken: !!token,
      tokenValid: !!payload,
      payloadUsername: payload?.username,
      articleTitle: body?.title
    });

    if (!payload || payload.username !== username) {
      console.log('❌ Save failed: Unauthorized');
      return sendJSON(res, 401, { error: 'Unauthorized' }, null, origin);
    }

    try {
      const article = saveArticle(username, body);
      console.log('✅ Article saved:', article.title);
      sendJSON(res, 200, { article }, null, origin);
    } catch (err) {
      console.log('❌ Save failed:', err.message);
      sendJSON(res, 500, { error: err.message }, null, origin);
    }
  },

  async deleteArticle(req, res, username, articleId) {
    const origin = req.headers.origin;
    const token = getAuthToken(req);
    const payload = verifyToken(token);

    if (!payload || payload.username !== username) {
      return sendJSON(res, 401, { error: 'Unauthorized' }, null, origin);
    }

    deleteArticle(username, articleId);
    sendJSON(res, 200, { success: true }, null, origin);
  }
};

// ===== SERVER =====

const server = http.createServer(async (req, res) => {
  // Get origin from request headers
  const origin = req.headers.origin;

  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, {}, null, origin);
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (req.method === 'POST' && path === '/api/auth/login') {
      const body = await parseBody(req);
      return routes.login(req, res, body);
    }

    if (req.method === 'POST' && path === '/api/auth/signup') {
      const body = await parseBody(req);
      return routes.signup(req, res, body);
    }

    if (req.method === 'POST' && path === '/api/auth/logout') {
      return routes.logout(req, res);
    }

    const getArticlesMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (req.method === 'GET' && getArticlesMatch) {
      return routes.getArticles(req, res, getArticlesMatch[1]);
    }

    const saveArticleMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (req.method === 'POST' && saveArticleMatch) {
      const body = await parseBody(req);
      return routes.saveArticle(req, res, saveArticleMatch[1], body);
    }

    const deleteArticleMatch = path.match(/^\/api\/articles\/([^\/]+)\/([^\/]+)$/);
    if (req.method === 'DELETE' && deleteArticleMatch) {
      return routes.deleteArticle(req, res, deleteArticleMatch[1], deleteArticleMatch[2]);
    }

    sendJSON(res, 404, { error: 'Not found' }, null, origin);
  } catch (err) {
    console.error('Error:', err);
    sendJSON(res, 500, { error: 'Internal server error' }, null, origin);
  }
});

// Initialize database and start server
initDatabase();
initStatements();

server.listen(PORT, () => {
  console.log(`\n🚀 Local API Server (SQLite) running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${DB_PATH}`);
  console.log(`\n📝 API Endpoints:`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/signup`);
  console.log(`   GET    /api/articles/:username`);
  console.log(`   POST   /api/articles/:username`);
  console.log(`   DELETE /api/articles/:username/:articleId\n`);
});
