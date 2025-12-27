/**
 * Cloudflare Worker API Handler
 * Handles all /api/* routes with D1 database
 */

const JWT_SECRET = 'cloudflare-worker-secret'; // TODO: Move to environment variable

// ===== UTILITIES =====

function generateToken(username) {
  const payload = JSON.stringify({ username, exp: Date.now() + 86400000 }); // 24h
  const encoder = new TextEncoder();
  const data = encoder.encode(payload + JWT_SECRET);

  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return btoa(payload) + '.' + hashHex;
  });
}

function verifyToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);

  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(data, status = 200, origin = null, setCookies = null) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  });

  // Support multiple Set-Cookie headers
  if (setCookies) {
    if (Array.isArray(setCookies)) {
      setCookies.forEach(cookie => headers.append('Set-Cookie', cookie));
    } else {
      headers.append('Set-Cookie', setCookies);
    }
  }

  return new Response(JSON.stringify(data), { status, headers });
}

function getAuthToken(request) {
  // Try cookie first
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, val] = c.trim().split('=');
        return [key, val];
      })
    );
    if (cookies.auth_token) {
      return cookies.auth_token;
    }
  }

  // Fallback to Authorization header
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.substring(7);
  }

  return null;
}

// ===== DATABASE QUERIES =====

async function getUserByUsername(db, username) {
  const result = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  return result;
}

async function createUser(db, username, email, passwordHash) {
  try {
    await db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .bind(username, email, passwordHash)
      .run();
    return getUserByUsername(db, username);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      throw new Error('Username already exists');
    }
    throw err;
  }
}

async function getArticlesByUsername(db, username) {
  const user = await getUserByUsername(db, username);
  if (!user) return [];

  const result = await db.prepare(`
    SELECT * FROM articles
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(user.id).all();

  return result.results || [];
}

async function saveArticle(db, username, article) {
  const user = await getUserByUsername(db, username);
  if (!user) throw new Error('User not found');

  const { id, title, slug, content, chapter, date, published } = article;

  await db.prepare(`
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
  `).bind(id, user.id, title, slug || '', content || '', chapter || '', date || '', published ? 1 : 0).run();

  return db.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first();
}

async function deleteArticle(db, username, articleId) {
  const user = await getUserByUsername(db, username);
  if (!user) throw new Error('User not found');

  await db.prepare('DELETE FROM articles WHERE id = ? AND user_id = ?')
    .bind(articleId, user.id)
    .run();
}

// ===== ROUTE HANDLERS =====

async function handleLogin(request, env) {
  const origin = request.headers.get('Origin');
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return jsonResponse({ error: 'Username and password required' }, 400, origin);
  }

  const user = await getUserByUsername(env.pluma_db, username);
  if (!user) {
    return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
  }

  const passwordHash = await hashPassword(password);
  if (user.password_hash !== passwordHash) {
    return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
  }

  const token = await generateToken(username);

  // Determine cookie domain from origin
  const hostname = new URL(origin || 'http://localhost').hostname;
  let cookieDomain = '';

  // Extract base domain for cookie sharing across subdomains
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // localhost - no domain
    cookieDomain = '';
  } else if (hostname.endsWith('.local')) {
    // pluma.local -> .pluma.local
    cookieDomain = '; Domain=.' + hostname.split('.').slice(-2).join('.');
  } else if (hostname.endsWith('.pages.dev')) {
    // pluma-a6y.pages.dev -> .pluma-a6y.pages.dev
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      cookieDomain = '; Domain=.' + parts.slice(-3).join('.');
    }
  } else {
    // pluma.ink -> .pluma.ink
    cookieDomain = '; Domain=.' + hostname.split('.').slice(-2).join('.');
  }

  // Set TWO cookies: auth_token (HttpOnly) + username (readable)
  const cookies = [
    `auth_token=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800${cookieDomain}`,
    `username=${username}; Secure; Path=/; SameSite=Lax; Max-Age=604800${cookieDomain}`
  ];

  return jsonResponse(
    { success: true, username, email: user.email, token },
    200,
    origin,
    cookies
  );
}

async function handleSignup(request, env) {
  const origin = request.headers.get('Origin');
  const body = await request.json();
  const { username, password, email } = body;

  if (!username || !password) {
    return jsonResponse({ error: 'Username and password required' }, 400, origin);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return jsonResponse({ error: 'Invalid username format' }, 400, origin);
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await createUser(env.pluma_db, username, email, passwordHash);
    const token = await generateToken(username);

    // Determine cookie domain from origin
    const hostname = new URL(origin || 'http://localhost').hostname;
    let cookieDomain = '';

    // Extract base domain for cookie sharing across subdomains
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // localhost - no domain
      cookieDomain = '';
    } else if (hostname.endsWith('.local')) {
      // pluma.local -> .pluma.local
      cookieDomain = '; Domain=.' + hostname.split('.').slice(-2).join('.');
    } else if (hostname.endsWith('.pages.dev')) {
      // pluma-a6y.pages.dev -> .pluma-a6y.pages.dev
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        cookieDomain = '; Domain=.' + parts.slice(-3).join('.');
      }
    } else {
      // pluma.ink -> .pluma.ink
      cookieDomain = '; Domain=.' + hostname.split('.').slice(-2).join('.');
    }

    // Set TWO cookies: auth_token (HttpOnly) + username (readable)
    const cookies = [
      `auth_token=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800${cookieDomain}`,
      `username=${username}; Secure; Path=/; SameSite=Lax; Max-Age=604800${cookieDomain}`
    ];

    return jsonResponse(
      { success: true, username, email: user.email, token },
      201,
      origin,
      cookies
    );
  } catch (err) {
    return jsonResponse({ error: err.message }, 409, origin);
  }
}

async function handleLogout(request) {
  const origin = request.headers.get('Origin');

  const hostname = new URL(origin || 'http://localhost').hostname;
  let cookieDomain = '';

  // Extract base domain for cookie sharing across subdomains
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // localhost - no domain
    cookieDomain = '';
  } else if (hostname.endsWith('.local')) {
    // pluma.local -> .pluma.local
    cookieDomain = '; Domain=.' + hostname.split('.').slice(-2).join('.');
  } else if (hostname.endsWith('.pages.dev')) {
    // pluma-a6y.pages.dev -> .pluma-a6y.pages.dev
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      cookieDomain = '; Domain=.' + parts.slice(-3).join('.');
    }
  } else {
    // pluma.ink -> .pluma.ink
    cookieDomain = '; Domain=.' + hostname.split('.').slice(-2).join('.');
  }

  // Clear BOTH cookies
  const cookies = [
    `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${cookieDomain}`,
    `username=; Path=/; SameSite=Lax; Max-Age=0${cookieDomain}`
  ];

  return jsonResponse({ success: true }, 200, origin, cookies);
}

async function handleWhoami(request) {
  const origin = request.headers.get('Origin');
  const token = getAuthToken(request);

  if (!token) {
    return jsonResponse({ authenticated: false }, 200, origin);
  }

  const payload = verifyToken(token);

  if (!payload) {
    return jsonResponse({ authenticated: false }, 200, origin);
  }

  return jsonResponse({
    authenticated: true,
    username: payload.username
  }, 200, origin);
}

async function handleGetArticles(request, env, username) {
  const origin = request.headers.get('Origin');

  const user = await getUserByUsername(env.pluma_db, username);
  if (!user) {
    return jsonResponse({ error: 'User not found' }, 404, origin);
  }

  const rawArticles = await getArticlesByUsername(env.pluma_db, username);

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

  return jsonResponse({ articles }, 200, origin);
}

async function handleSaveArticle(request, env, username) {
  const origin = request.headers.get('Origin');
  const token = getAuthToken(request);
  const payload = verifyToken(token);

  if (!payload || payload.username !== username) {
    return jsonResponse({ error: 'Unauthorized' }, 401, origin);
  }

  const body = await request.json();

  try {
    const article = await saveArticle(env.pluma_db, username, body);
    return jsonResponse({ article }, 200, origin);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500, origin);
  }
}

async function handleDeleteArticle(request, env, username, articleId) {
  const origin = request.headers.get('Origin');
  const token = getAuthToken(request);
  const payload = verifyToken(token);

  if (!payload || payload.username !== username) {
    return jsonResponse({ error: 'Unauthorized' }, 401, origin);
  }

  await deleteArticle(env.pluma_db, username, articleId);
  return jsonResponse({ success: true }, 200, origin);
}

// ===== MAIN HANDLER =====

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(origin)
    });
  }

  const path = url.pathname;

  try {
    // Auth routes
    if (request.method === 'POST' && path === '/api/auth/login') {
      return handleLogin(request, env);
    }

    if (request.method === 'POST' && path === '/api/auth/signup') {
      return handleSignup(request, env);
    }

    if (request.method === 'POST' && path === '/api/auth/logout') {
      return handleLogout(request);
    }

    if (request.method === 'GET' && path === '/api/auth/whoami') {
      return handleWhoami(request);
    }

    // Article routes
    const getArticlesMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (request.method === 'GET' && getArticlesMatch) {
      return handleGetArticles(request, env, getArticlesMatch[1]);
    }

    const saveArticleMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (request.method === 'POST' && saveArticleMatch) {
      return handleSaveArticle(request, env, saveArticleMatch[1]);
    }

    const deleteArticleMatch = path.match(/^\/api\/articles\/([^\/]+)\/([^\/]+)$/);
    if (request.method === 'DELETE' && deleteArticleMatch) {
      return handleDeleteArticle(request, env, deleteArticleMatch[1], deleteArticleMatch[2]);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
  } catch (err) {
    console.error('Error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500, origin);
  }
}
