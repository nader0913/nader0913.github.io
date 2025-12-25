const { createClient } = require('@vercel/postgres');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Helper to execute SQL queries using template literals
async function sql(strings, ...values) {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL_NON_POOLING
  });
  await client.connect();

  try {
    // Build the query
    let query = strings[0];
    const params = [];

    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      query += `$${i + 1}` + strings[i + 1];
    }

    const result = await client.query(query, params);
    return result;
  } finally {
    await client.end();
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
    if (err.code === '23505') {
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

async function saveArticleForUser(username, article) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error('User not found');

  const { id, title, content, chapter, date } = article;

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

async function deleteArticleForUser(username, articleId) {
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
  res.status(status).json(data);
}

function getAuthToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

// ===== MAIN HANDLER =====

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;

  try {
    // POST /api/auth/login
    if (method === 'POST' && url === '/api/auth/login') {
      const body = await parseBody(req);
      const { username, password } = body;

      if (!username || !password) {
        return sendJSON(res, 400, { error: 'Username and password required' });
      }

      const user = await getUserByUsername(username);
      if (!user || user.password_hash !== hashPassword(password)) {
        return sendJSON(res, 401, { error: 'Invalid credentials' });
      }

      const token = generateToken(username);
      return sendJSON(res, 200, { token, username, email: user.email });
    }

    // POST /api/auth/signup
    if (method === 'POST' && url === '/api/auth/signup') {
      const body = await parseBody(req);
      const { username, password, email } = body;

      if (!username || !password) {
        return sendJSON(res, 400, { error: 'Username and password required' });
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return sendJSON(res, 400, { error: 'Invalid username format' });
      }

      try {
        await createUser(username, password, email);
        const token = generateToken(username);
        return sendJSON(res, 201, { token, username, email });
      } catch (err) {
        return sendJSON(res, 409, { error: err.message });
      }
    }

    // GET /api/articles/:username
    const getArticlesMatch = url.match(/^\/api\/articles\/([^\/]+)$/);
    if (method === 'GET' && getArticlesMatch) {
      const username = getArticlesMatch[1];
      const user = await getUserByUsername(username);

      if (!user) {
        return sendJSON(res, 404, { error: 'User not found' });
      }

      const articles = await getArticlesByUsername(username);
      return sendJSON(res, 200, { articles });
    }

    // POST /api/articles/:username
    const saveArticleMatch = url.match(/^\/api\/articles\/([^\/]+)$/);
    if (method === 'POST' && saveArticleMatch) {
      const username = saveArticleMatch[1];
      const token = getAuthToken(req);
      const payload = verifyToken(token);

      if (!payload || payload.username !== username) {
        return sendJSON(res, 401, { error: 'Unauthorized' });
      }

      const body = await parseBody(req);
      const article = await saveArticleForUser(username, body);
      return sendJSON(res, 200, { article });
    }

    // DELETE /api/articles/:username/:articleId
    const deleteArticleMatch = url.match(/^\/api\/articles\/([^\/]+)\/([^\/]+)$/);
    if (method === 'DELETE' && deleteArticleMatch) {
      const username = deleteArticleMatch[1];
      const articleId = deleteArticleMatch[2];
      const token = getAuthToken(req);
      const payload = verifyToken(token);

      if (!payload || payload.username !== username) {
        return sendJSON(res, 401, { error: 'Unauthorized' });
      }

      await deleteArticleForUser(username, articleId);
      return sendJSON(res, 200, { success: true });
    }

    // 404
    sendJSON(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Error:', err);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
};
