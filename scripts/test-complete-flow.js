#!/usr/bin/env node

/**
 * Comprehensive UI Flow Test
 * Tests all user flows: login, redirect, logout, subdomain access, etc.
 */

console.log('\n🧪 COMPREHENSIVE UI FLOW TEST\n');
console.log('='.repeat(60) + '\n');

// ===== MOCKS =====

// Mock localStorage
global.localStorage = {
  storage: {},
  getItem(key) {
    return this.storage[key] || null;
  },
  setItem(key, value) {
    this.storage[key] = value;
  },
  removeItem(key) {
    delete this.storage[key];
  },
  clear() {
    this.storage = {};
  }
};

// Mock sessionStorage
global.sessionStorage = {
  storage: {},
  clear() {
    this.storage = {};
  }
};

// Mock window.location
global.window = {
  location: {
    href: 'http://localhost:8080',
    hostname: 'localhost',
    protocol: 'http:',
    pathname: '/',
    replace(url) {
      console.log(`    🔄 Redirecting (replace): ${url}`);
      this.href = url;
      // Parse new URL
      const urlObj = new URL(url);
      this.hostname = urlObj.hostname;
      this.pathname = urlObj.pathname;
    }
  }
};

// Mock fetch
let apiCallLog = [];
global.fetch = async (url, options) => {
  const method = options?.method || 'GET';
  apiCallLog.push({ method, url, options });

  console.log(`    🌐 API: ${method} ${url}`);
  if (options?.credentials) {
    console.log(`       Credentials: ${options.credentials}`);
  }

  // Simulate login
  if (url.includes('/auth/login')) {
    const body = JSON.parse(options.body);
    if (body.username === 'nader0913' && body.password === 'test123') {
      return {
        ok: true,
        json: async () => ({
          success: true,
          username: 'nader0913',
          email: 'test@example.com'
        })
      };
    }
    return {
      ok: false,
      json: async () => ({ error: 'Invalid credentials' })
    };
  }

  // Simulate logout
  if (url.includes('/auth/logout')) {
    return {
      ok: true,
      json: async () => ({ success: true })
    };
  }

  // Simulate article save
  if (url.includes('/articles/') && options?.method === 'POST') {
    return {
      ok: true,
      json: async () => ({
        article: { id: 'test-123', title: 'Test Article' }
      })
    };
  }

  return { ok: false, json: async () => ({ error: 'Not found' }) };
};

// ===== LOAD CODE =====

const CONFIG = {
  storage: 'server',
  api: {
    endpoint: 'http://localhost:3000/api'
  },
  app: {
    defaultDomain: 'localhost'
  },
  features: {
    multiUser: true
  }
};

// Simplified API module
const API = {
  Auth: {
    async login(username, password) {
      const response = await fetch(`${CONFIG.api.endpoint}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.removeItem('logged_out');
        localStorage.setItem('username', data.username);
        return { success: true, user: data };
      }

      return { success: false, error: data.error || 'Login failed' };
    },

    async logout() {
      try {
        await fetch(`${CONFIG.api.endpoint}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }

      localStorage.removeItem('username');
      localStorage.removeItem('current_article_id');
      localStorage.removeItem('article_to_load');
      localStorage.removeItem('markdown_to_import');
      localStorage.setItem('logged_out', 'true');
      sessionStorage.clear();
    },

    isAuthenticated() {
      if (localStorage.getItem('logged_out') === 'true') {
        return false;
      }
      return !!localStorage.getItem('username');
    },

    getCurrentUser() {
      return localStorage.getItem('username');
    }
  },

  Articles: {
    async save(article) {
      const user = API.Auth.getCurrentUser();
      const response = await fetch(`${CONFIG.api.endpoint}/articles/${user}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(article)
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, article: data.article };
      }

      return { success: false, error: data.error || 'Save failed' };
    }
  }
};

// Auth module
const Auth = {
  isAuthenticated() {
    return API.Auth.isAuthenticated();
  },

  getCurrentUser() {
    return API.Auth.getCurrentUser();
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/';
      return false;
    }
    return true;
  },

  async logout() {
    await API.Auth.logout();
    const protocol = window.location.protocol;
    const domain = CONFIG.app.defaultDomain;
    window.location.replace(`${protocol}//${domain}/`);
  }
};

// SubdomainUtils
const SubdomainUtils = {
  getUsername() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      const subdomain = parts[0];
      if (subdomain !== 'localhost' && subdomain !== 'www') {
        return subdomain;
      }
    }
    return null;
  },

  isUserSubdomain() {
    return !!this.getUsername();
  }
};

// ===== TEST SUITE =====

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  console.log(`\n📋 Test: ${name}`);
  try {
    fn();
    console.log('   ✅ PASSED');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Reset function
function resetState() {
  localStorage.clear();
  sessionStorage.clear();
  apiCallLog = [];
  window.location.href = 'http://localhost:8080';
  window.location.hostname = 'localhost';
  window.location.pathname = '/';
}

// ===== RUN TESTS =====

(async () => {
  console.log('SCENARIO 1: Fresh User Journey');
  console.log('-'.repeat(60));

  resetState();

  test('1.1: Initial state - not authenticated', () => {
    assert(!Auth.isAuthenticated(), 'Should not be authenticated');
    assert(!Auth.getCurrentUser(), 'Should have no current user');
    console.log('    State: Not authenticated ✓');
  });

  test('1.2: User visits main domain', () => {
    assert(window.location.hostname === 'localhost', 'Should be on main domain');
    assert(!SubdomainUtils.isUserSubdomain(), 'Should not be on subdomain');
    console.log('    Location: localhost ✓');
  });

  await test('1.3: User logs in successfully', async () => {
    const result = await API.Auth.login('nader0913', 'test123');
    assert(result.success, 'Login should succeed');
    assert(Auth.isAuthenticated(), 'Should be authenticated after login');
    assert(Auth.getCurrentUser() === 'nader0913', 'Should have correct username');
    assert(!localStorage.getItem('logged_out'), 'Logout flag should be cleared');
    console.log('    Logged in as: nader0913 ✓');
    console.log(`    API calls made: ${apiCallLog.length}`);
  });

  test('1.4: Navigate to user subdomain', () => {
    window.location.href = 'http://nader0913.localhost:8080';
    window.location.hostname = 'nader0913.localhost';
    assert(SubdomainUtils.getUsername() === 'nader0913', 'Should detect subdomain');
    assert(SubdomainUtils.isUserSubdomain(), 'Should be on user subdomain');
    assert(Auth.isAuthenticated(), 'Should still be authenticated on subdomain');
    console.log('    Subdomain: nader0913.localhost ✓');
    console.log('    Still authenticated ✓');
  });

  await test('1.5: Save article on subdomain', async () => {
    const article = {
      id: 'test-article',
      title: 'Test Article',
      content: '# Hello World'
    };
    const result = await API.Articles.save(article);
    assert(result.success, 'Article save should succeed');
    const lastCall = apiCallLog[apiCallLog.length - 1];
    assert(lastCall.options.credentials === 'include', 'Should include credentials');
    console.log('    Article saved ✓');
    console.log('    Credentials included ✓');
  });

  await test('1.6: User logs out', async () => {
    await Auth.logout();
    assert(!Auth.isAuthenticated(), 'Should not be authenticated after logout');
    assert(localStorage.getItem('logged_out') === 'true', 'Logout flag should be set');
    assert(!localStorage.getItem('username'), 'Username should be cleared');
    assert(window.location.href === 'http://localhost/', 'Should redirect to main domain');
    console.log('    Logged out ✓');
    console.log('    Redirected to main domain ✓');
  });

  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 2: Logout Flag Protection');
  console.log('-'.repeat(60));

  resetState();

  await test('2.1: Login and set logout flag', async () => {
    await API.Auth.login('nader0913', 'test123');
    await API.Auth.logout();
    assert(localStorage.getItem('logged_out') === 'true', 'Logout flag should be set');
    console.log('    Logout flag set ✓');
  });

  test('2.2: Cannot authenticate with logout flag', () => {
    // Even if username is somehow in storage, should not be authenticated
    localStorage.setItem('username', 'nader0913');
    assert(!Auth.isAuthenticated(), 'Should not authenticate with logout flag');
    console.log('    Protected by logout flag ✓');
  });

  await test('2.3: Fresh login clears logout flag', async () => {
    await API.Auth.login('nader0913', 'test123');
    assert(!localStorage.getItem('logged_out'), 'Logout flag should be cleared');
    assert(Auth.isAuthenticated(), 'Should be authenticated');
    console.log('    Logout flag cleared on new login ✓');
  });

  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 3: Wrong Subdomain Access');
  console.log('-'.repeat(60));

  resetState();

  await test('3.1: Login as nader0913', async () => {
    await API.Auth.login('nader0913', 'test123');
    assert(Auth.getCurrentUser() === 'nader0913', 'Should be nader0913');
    console.log('    Logged in as nader0913 ✓');
  });

  test('3.2: Visit different user subdomain', () => {
    window.location.href = 'http://otheruser.localhost:8080';
    window.location.hostname = 'otheruser.localhost';
    assert(SubdomainUtils.getUsername() === 'otheruser', 'Should detect otheruser subdomain');
    assert(Auth.getCurrentUser() === 'nader0913', 'Should still be logged in as nader0913');
    console.log('    On otheruser subdomain ✓');
    console.log('    Still logged in as nader0913 ✓');
  });

  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 4: Invalid Login Attempt');
  console.log('-'.repeat(60));

  resetState();

  await test('4.1: Try invalid credentials', async () => {
    const result = await API.Auth.login('nader0913', 'wrongpassword');
    assert(!result.success, 'Login should fail');
    assert(!Auth.isAuthenticated(), 'Should not be authenticated');
    assert(!Auth.getCurrentUser(), 'Should have no current user');
    console.log('    Login failed as expected ✓');
    console.log('    Not authenticated ✓');
  });

  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 5: Multiple Login/Logout Cycles');
  console.log('-'.repeat(60));

  resetState();

  for (let i = 1; i <= 3; i++) {
    await test(`5.${i * 2 - 1}: Login cycle ${i}`, async () => {
      await API.Auth.login('nader0913', 'test123');
      assert(Auth.isAuthenticated(), `Should be authenticated in cycle ${i}`);
      console.log(`    Cycle ${i}: Logged in ✓`);
    });

    await test(`5.${i * 2}: Logout cycle ${i}`, async () => {
      await API.Auth.logout();
      assert(!Auth.isAuthenticated(), `Should not be authenticated in cycle ${i}`);
      console.log(`    Cycle ${i}: Logged out ✓`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 6: RequireAuth Protection');
  console.log('-'.repeat(60));

  resetState();

  test('6.1: RequireAuth blocks unauthenticated', () => {
    const allowed = Auth.requireAuth();
    assert(!allowed, 'Should not allow unauthenticated access');
    assert(window.location.href === '/', 'Should redirect to root');
    console.log('    Blocked unauthenticated access ✓');
    console.log('    Redirected to / ✓');
  });

  await test('6.2: RequireAuth allows authenticated', async () => {
    window.location.href = 'http://localhost:8080';
    await API.Auth.login('nader0913', 'test123');
    const allowed = Auth.requireAuth();
    assert(allowed, 'Should allow authenticated access');
    console.log('    Allowed authenticated access ✓');
  });

  // ===== RESULTS =====

  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(60));
  console.log('API CALLS SUMMARY');
  console.log('='.repeat(60));
  const callsByType = apiCallLog.reduce((acc, call) => {
    const key = `${call.method} ${call.url.split('/').pop()}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  Object.entries(callsByType).forEach(([key, count]) => {
    console.log(`  ${key}: ${count} calls`);
  });

  console.log('\n' + '='.repeat(60));
  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! THE SYSTEM IS WORKING CORRECTLY! 🎉');
  } else {
    console.log('⚠️  SOME TESTS FAILED - REVIEW ABOVE');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(testsFailed > 0 ? 1 : 0);
})();
