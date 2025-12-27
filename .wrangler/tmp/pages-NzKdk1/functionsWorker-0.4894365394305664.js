var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/[[path]].js
var JWT_SECRET = "cloudflare-worker-secret";
function generateToken(username) {
  const payload = JSON.stringify({ username, exp: Date.now() + 864e5 });
  const encoder = new TextEncoder();
  const data = encoder.encode(payload + JWT_SECRET);
  return crypto.subtle.digest("SHA-256", data).then((hash) => {
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return btoa(payload) + "." + hashHex;
  });
}
__name(generateToken, "generateToken");
function verifyToken(token) {
  try {
    const [payloadB64, signature] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);
  return crypto.subtle.digest("SHA-256", data).then((hash) => {
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}
__name(hashPassword, "hashPassword");
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonResponse(data, status = 200, origin = null, setCookies = null) {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...corsHeaders(origin)
  });
  if (setCookies) {
    if (Array.isArray(setCookies)) {
      setCookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
    } else {
      headers.append("Set-Cookie", setCookies);
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}
__name(jsonResponse, "jsonResponse");
function getAuthToken(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, val] = c.trim().split("=");
        return [key, val];
      })
    );
    if (cookies.auth_token) {
      return cookies.auth_token;
    }
  }
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.substring(7);
  }
  return null;
}
__name(getAuthToken, "getAuthToken");
async function getUserByUsername(db, username) {
  const result = await db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  return result;
}
__name(getUserByUsername, "getUserByUsername");
async function createUser(db, username, email, passwordHash) {
  try {
    await db.prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)").bind(username, email, passwordHash).run();
    return getUserByUsername(db, username);
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      throw new Error("Username already exists");
    }
    throw err;
  }
}
__name(createUser, "createUser");
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
__name(getArticlesByUsername, "getArticlesByUsername");
async function saveArticle(db, username, article) {
  const user = await getUserByUsername(db, username);
  if (!user) throw new Error("User not found");
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
  `).bind(id, user.id, title, slug || "", content || "", chapter || "", date || "", published ? 1 : 0).run();
  return db.prepare("SELECT * FROM articles WHERE id = ?").bind(id).first();
}
__name(saveArticle, "saveArticle");
async function deleteArticle(db, username, articleId) {
  const user = await getUserByUsername(db, username);
  if (!user) throw new Error("User not found");
  await db.prepare("DELETE FROM articles WHERE id = ? AND user_id = ?").bind(articleId, user.id).run();
}
__name(deleteArticle, "deleteArticle");
async function handleLogin(request, env) {
  const origin = request.headers.get("Origin");
  const body = await request.json();
  const { username, password } = body;
  if (!username || !password) {
    return jsonResponse({ error: "Username and password required" }, 400, origin);
  }
  const user = await getUserByUsername(env.pluma_db, username);
  if (!user) {
    return jsonResponse({ error: "Invalid credentials" }, 401, origin);
  }
  const passwordHash = await hashPassword(password);
  if (user.password_hash !== passwordHash) {
    return jsonResponse({ error: "Invalid credentials" }, 401, origin);
  }
  const token = await generateToken(username);
  const hostname = new URL(origin || "http://localhost").hostname;
  let cookieDomain = "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    cookieDomain = "";
  } else if (hostname.endsWith(".local")) {
    cookieDomain = "; Domain=." + hostname.split(".").slice(-2).join(".");
  } else if (hostname.endsWith(".pages.dev")) {
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      cookieDomain = "; Domain=." + parts.slice(-3).join(".");
    }
  } else {
    cookieDomain = "; Domain=." + hostname.split(".").slice(-2).join(".");
  }
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
__name(handleLogin, "handleLogin");
async function handleSignup(request, env) {
  const origin = request.headers.get("Origin");
  const body = await request.json();
  const { username, password, email } = body;
  if (!username || !password) {
    return jsonResponse({ error: "Username and password required" }, 400, origin);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return jsonResponse({ error: "Invalid username format" }, 400, origin);
  }
  try {
    const passwordHash = await hashPassword(password);
    const user = await createUser(env.pluma_db, username, email, passwordHash);
    const token = await generateToken(username);
    const hostname = new URL(origin || "http://localhost").hostname;
    let cookieDomain = "";
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      cookieDomain = "";
    } else if (hostname.endsWith(".local")) {
      cookieDomain = "; Domain=." + hostname.split(".").slice(-2).join(".");
    } else if (hostname.endsWith(".pages.dev")) {
      const parts = hostname.split(".");
      if (parts.length >= 3) {
        cookieDomain = "; Domain=." + parts.slice(-3).join(".");
      }
    } else {
      cookieDomain = "; Domain=." + hostname.split(".").slice(-2).join(".");
    }
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
__name(handleSignup, "handleSignup");
async function handleLogout(request) {
  const origin = request.headers.get("Origin");
  const hostname = new URL(origin || "http://localhost").hostname;
  let cookieDomain = "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    cookieDomain = "";
  } else if (hostname.endsWith(".local")) {
    cookieDomain = "; Domain=." + hostname.split(".").slice(-2).join(".");
  } else if (hostname.endsWith(".pages.dev")) {
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      cookieDomain = "; Domain=." + parts.slice(-3).join(".");
    }
  } else {
    cookieDomain = "; Domain=." + hostname.split(".").slice(-2).join(".");
  }
  const cookies = [
    `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${cookieDomain}`,
    `username=; Path=/; SameSite=Lax; Max-Age=0${cookieDomain}`
  ];
  return jsonResponse({ success: true }, 200, origin, cookies);
}
__name(handleLogout, "handleLogout");
async function handleWhoami(request) {
  const origin = request.headers.get("Origin");
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
__name(handleWhoami, "handleWhoami");
async function handleGetArticles(request, env, username) {
  const origin = request.headers.get("Origin");
  const user = await getUserByUsername(env.pluma_db, username);
  if (!user) {
    return jsonResponse({ error: "User not found" }, 404, origin);
  }
  const rawArticles = await getArticlesByUsername(env.pluma_db, username);
  const articles = rawArticles.map((article) => ({
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
__name(handleGetArticles, "handleGetArticles");
async function handleSaveArticle(request, env, username) {
  const origin = request.headers.get("Origin");
  const token = getAuthToken(request);
  const payload = verifyToken(token);
  if (!payload || payload.username !== username) {
    return jsonResponse({ error: "Unauthorized" }, 401, origin);
  }
  const body = await request.json();
  try {
    const article = await saveArticle(env.pluma_db, username, body);
    return jsonResponse({ article }, 200, origin);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500, origin);
  }
}
__name(handleSaveArticle, "handleSaveArticle");
async function handleDeleteArticle(request, env, username, articleId) {
  const origin = request.headers.get("Origin");
  const token = getAuthToken(request);
  const payload = verifyToken(token);
  if (!payload || payload.username !== username) {
    return jsonResponse({ error: "Unauthorized" }, 401, origin);
  }
  await deleteArticle(env.pluma_db, username, articleId);
  return jsonResponse({ success: true }, 200, origin);
}
__name(handleDeleteArticle, "handleDeleteArticle");
async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(origin)
    });
  }
  const path = url.pathname;
  try {
    if (request.method === "POST" && path === "/api/auth/login") {
      return handleLogin(request, env);
    }
    if (request.method === "POST" && path === "/api/auth/signup") {
      return handleSignup(request, env);
    }
    if (request.method === "POST" && path === "/api/auth/logout") {
      return handleLogout(request);
    }
    if (request.method === "GET" && path === "/api/auth/whoami") {
      return handleWhoami(request);
    }
    const getArticlesMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (request.method === "GET" && getArticlesMatch) {
      return handleGetArticles(request, env, getArticlesMatch[1]);
    }
    const saveArticleMatch = path.match(/^\/api\/articles\/([^\/]+)$/);
    if (request.method === "POST" && saveArticleMatch) {
      return handleSaveArticle(request, env, saveArticleMatch[1]);
    }
    const deleteArticleMatch = path.match(/^\/api\/articles\/([^\/]+)\/([^\/]+)$/);
    if (request.method === "DELETE" && deleteArticleMatch) {
      return handleDeleteArticle(request, env, deleteArticleMatch[1], deleteArticleMatch[2]);
    }
    return jsonResponse({ error: "Not found" }, 404, origin);
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-NzKdk1/functionsRoutes-0.4743266255488514.mjs
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../.nvm/versions/node/v22.9.0/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../.nvm/versions/node/v22.9.0/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
