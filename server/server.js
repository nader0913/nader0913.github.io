#!/usr/bin/env node

/**
 * Multi-User Article Platform Server
 *
 * Features:
 * - JWT authentication
 * - Vercel Postgres database
 * - CORS enabled
 *
 * Usage: node server.js
 */

const http = require('http');
const crypto = require('crypto');
const { sql } = require('@vercel/postgres');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// ===== DATABASE =====

async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create articles table
    await sql`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        chapter VARCHAR(255),
        date VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
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

    // Verify signature
    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(payloadB64);
    const expectedSignature = hmac.digest('base64');

    if (signature !== expectedSignature) return null;
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// ===== DATABASE QUERIES =====

async function getUserByUsername(username) {
  const result = await sql`
    SELECT * FROM users WHERE username = ${username}
  `;
  return result.rows[0] || null;
}

async function createUser(username, password, email) {
  const passwordHash = hashPassword(password);

  try {
    const result = await sql`
      INSERT INTO users (username, email, password_hash)
      VALUES (${username}, ${email}, ${passwordHash})
      RETURNING id, username, email, created_at
    `;
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      throw new Error('Username already exists');
    }
    throw err;
  }
}

async function getArticlesByUsername(username) {
  const result = await sql`
    SELECT a.* FROM articles a
    JOIN users u ON a.user_id = u.id
    WHERE u.username = ${username}
    ORDER BY a.created_at DESC
  `;
  return result.rows;
}

async function saveArticle(username, article) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error('User not found');

  const { id, title, content, chapter, date } = article;

  // Upsert article
  const result = await sql`
    INSERT INTO articles (id, user_id, title, content, chapter, date, updated_at)
    VALUES (${id}, ${user.id}, ${title}, ${content || ''}, ${chapter || ''}, ${date || ''}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      chapter = EXCLUDED.chapter,
      date = EXCLUDED.date,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return result.rows[0];
}

async function deleteArticle(username, articleId) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error('User not found');

  await sql`
    DELETE FROM articles
    WHERE id = ${articleId} AND user_id = ${user.id}
  `;
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

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function getAuthToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

// ===== ROUTES =====

const routes = {
  // POST /api/auth/login
  async login(req, res, body) {
    const { username, password } = body;

    console.log('🔐 LOGIN ATTEMPT:', { username, hasPassword: !!password });

    if (!username || !password) {
      console.log('❌ Login failed: Missing credentials');
      return sendJSON(res, 400, { error: 'Username and password required' });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      console.log('❌ Login failed: User not found');
      return sendJSON(res, 401, { error: 'Invalid credentials' });
    }

    if (user.password_hash !== hashPassword(password)) {
      console.log('❌ Login failed: Wrong password');
      return sendJSON(res, 401, { error: 'Invalid credentials' });
    }

    const token = generateToken(username);
    console.log('✅ Login successful:', username);
    sendJSON(res, 200, { token, username, email: user.email });
  },

  // POST /api/auth/signup
  async signup(req, res, body) {
    const { username, password, email } = body;

    console.log('📝 SIGNUP ATTEMPT:', { username, email, hasPassword: !!password });

    if (!username || !password) {
      console.log('❌ Signup failed: Missing credentials');
      return sendJSON(res, 400, { error: 'Username and password required' });
    }

    // Validate username
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      console.log('❌ Signup failed: Invalid username format');
      return sendJSON(res, 400, { error: 'Invalid username format' });
    }

    try {
      await createUser(username, password, email);
      const token = generateToken(username);
      console.log('✅ Signup successful:', username);
      sendJSON(res, 201, { token, username, email });
    } catch (err) {
      console.log('❌ Signup failed:', err.message);
      sendJSON(res, 409, { error: err.message });
    }
  },

  // GET /api/articles/:username
  async getArticles(req, res, username) {
    const user = await getUserByUsername(username);
    if (!user) {
      return sendJSON(res, 404, { error: 'User not found' });
    }

    const articles = await getArticlesByUsername(username);
    sendJSON(res, 200, { articles });
  },

  // POST /api/articles/:username
  async saveArticle(req, res, username, body) {
    const token = getAuthToken(req);
    const payload = verifyToken(token);

    if (!payload || payload.username !== username) {
      return sendJSON(res, 401, { error: 'Unauthorized' });
    }

    const article = await saveArticle(username, body);
    sendJSON(res, 200, { article });
  },

  // DELETE /api/articles/:username/:articleId
  async deleteArticle(req, res, username, articleId) {
    const token = getAuthToken(req);
    const payload = verifyToken(token);

    if (!payload || payload.username !== username) {
      return sendJSON(res, 401, { error: 'Unauthorized' });
    }

    await deleteArticle(username, articleId);
    sendJSON(res, 200, { success: true });
  }
};

// ===== SERVER =====

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, {});
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // Route: POST /api/auth/login
    if (req.method === 'POST' && path === '/api/auth/login') {
      const body = await parseBody(req);
      return routes.login(req, res, body);
    }

    // Route: POST /api/auth/signup
    if (req.method === 'POST' && path === '/api/auth/signup') {
      const body = await parseBody(req);
      return routes.signup(req, res, body);
    }

    // Route: GET /api/articles/:username
    const getArticlesMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (req.method === 'GET' && getArticlesMatch) {
      return routes.getArticles(req, res, getArticlesMatch[1]);
    }

    // Route: POST /api/articles/:username
    const saveArticleMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (req.method === 'POST' && saveArticleMatch) {
      const body = await parseBody(req);
      return routes.saveArticle(req, res, saveArticleMatch[1], body);
    }

    // Route: DELETE /api/articles/:username/:articleId
    const deleteArticleMatch = path.match(/^\/api\/articles\/([^\/]+)\/([^\/]+)$/);
    if (req.method === 'DELETE' && deleteArticleMatch) {
      return routes.deleteArticle(req, res, deleteArticleMatch[1], deleteArticleMatch[2]);
    }

    // 404
    sendJSON(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Error:', err);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
});

// Initialize database and start server
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Article Platform Server running on http://localhost:${PORT}`);
    console.log(`\n📝 API Endpoints:`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   POST   /api/auth/signup`);
    console.log(`   GET    /api/articles/:username`);
    console.log(`   POST   /api/articles/:username`);
    console.log(`   DELETE /api/articles/:username/:articleId\n`);
  });
});
