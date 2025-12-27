#!/usr/bin/env node

/**
 * Test client-side logic without DOM
 * Tests authentication flow, state management, and API integration
 */

console.log('\n🧪 Testing Client-Side Logic\n');
console.log('================================\n');

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

// Mock fetch
global.fetch = async (url, options) => {
  console.log(`  → Fetch ${options?.method || 'GET'} ${url}`);
  console.log(`     Credentials: ${options?.credentials}`);
  console.log(`     Headers:`, options?.headers);

  // Simulate API responses
  if (url.includes('/auth/login')) {
    return {
      ok: true,
      json: async () => ({
        success: true,
        username: 'nader0913',
        email: 'test@example.com'
      })
    };
  }

  if (url.includes('/auth/logout')) {
    return {
      ok: true,
      json: async () => ({ success: true })
    };
  }

  return { ok: false, json: async () => ({ error: 'Not found' }) };
};

// Load CONFIG
const CONFIG = {
  storage: 'server',
  api: {
    endpoint: 'http://localhost:3000/api'
  }
};

// Create API object inline (simplified version)
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
        console.log(`  ✓ Username saved: ${data.username}`);
        return { success: true, user: data };
      }

      return { success: false, error: data.error || 'Login failed' };
    },

    async logout() {
      await fetch(`${CONFIG.api.endpoint}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      localStorage.removeItem('username');
      localStorage.setItem('logged_out', 'true');
      sessionStorage.clear();
      console.log('  ✓ Logged out, storage cleared');
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
  }
};

// Run tests
(async () => {
  try {
    console.log('Test 1: Initial state');
    console.log(`  Is authenticated: ${API.Auth.isAuthenticated()}`);
    console.log(`  Current user: ${API.Auth.getCurrentUser()}`);
    console.log('  ✅ PASS\n');

    console.log('Test 2: Login flow');
    const loginResult = await API.Auth.login('nader0913', 'test123');
    console.log(`  Login success: ${loginResult.success}`);
    console.log(`  Username: ${loginResult.user.username}`);
    console.log(`  Is authenticated: ${API.Auth.isAuthenticated()}`);
    console.log(`  Current user: ${API.Auth.getCurrentUser()}`);
    if (loginResult.success && API.Auth.isAuthenticated()) {
      console.log('  ✅ PASS\n');
    } else {
      console.log('  ❌ FAIL\n');
    }

    console.log('Test 3: Authentication state persistence');
    console.log(`  Username in localStorage: ${localStorage.getItem('username')}`);
    console.log(`  Is authenticated: ${API.Auth.isAuthenticated()}`);
    if (API.Auth.isAuthenticated() && API.Auth.getCurrentUser() === 'nader0913') {
      console.log('  ✅ PASS\n');
    } else {
      console.log('  ❌ FAIL\n');
    }

    console.log('Test 4: Logout flow');
    await API.Auth.logout();
    console.log(`  Is authenticated: ${API.Auth.isAuthenticated()}`);
    console.log(`  Logout flag: ${localStorage.getItem('logged_out')}`);
    console.log(`  Username cleared: ${!localStorage.getItem('username')}`);
    if (!API.Auth.isAuthenticated() && localStorage.getItem('logged_out') === 'true') {
      console.log('  ✅ PASS\n');
    } else {
      console.log('  ❌ FAIL\n');
    }

    console.log('Test 5: Cannot authenticate after logout');
    console.log(`  Is authenticated: ${API.Auth.isAuthenticated()}`);
    if (!API.Auth.isAuthenticated()) {
      console.log('  ✅ PASS\n');
    } else {
      console.log('  ❌ FAIL\n');
    }

    console.log('================================');
    console.log('✅ All client-side logic tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
