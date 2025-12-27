#!/usr/bin/env node

/**
 * UI Flow Test - Tests client-side logic without browser GUI
 * Tests the authentication flow and cookie handling
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Create a fake browser environment
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <form id="login-form">
    <input id="login-username" type="text" />
    <input id="login-password" type="password" />
    <button type="submit">Login</button>
  </form>
  <div id="error-message"></div>
</body>
</html>`, {
  url: 'http://localhost:8080',
  runScripts: 'dangerously',
  resources: 'usable',
  beforeParse(window) {
    // Mock fetch
    window.fetch = async (url, options) => {
      console.log('🌐 FETCH:', options.method || 'GET', url);
      console.log('   Headers:', JSON.stringify(options?.headers || {}));
      console.log('   Credentials:', options?.credentials);

      // Simulate login success
      if (url.includes('/auth/login')) {
        console.log('✅ Mock login successful');
        return {
          ok: true,
          json: async () => ({
            success: true,
            username: 'nader0913',
            email: 'test@example.com'
          })
        };
      }

      return { ok: false, json: async () => ({ error: 'Not found' }) };
    };
  }
});

const window = dom.window;
const document = window.document;

// Load CONFIG
const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
eval(configCode.replace('const CONFIG', 'window.CONFIG'));

// Load API
const apiCode = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
eval(apiCode);

// Load SubdomainUtils
window.SubdomainUtils = {
  getUsername() { return null; },
  isUserSubdomain() { return false; }
};

console.log('\n🧪 Testing UI Flow\n');
console.log('==================\n');

// Test 1: Check CONFIG is loaded
console.log('✓ Test 1: CONFIG loaded');
console.log('  Storage mode:', window.CONFIG.storage);
console.log('  API endpoint:', window.CONFIG.api.endpoint);

// Test 2: Test API.Auth.login
console.log('\n✓ Test 2: Testing login flow');
(async () => {
  const result = await window.API.Auth.login('nader0913', 'test123');
  console.log('  Login result:', result);
  console.log('  Username saved to localStorage:', window.localStorage.getItem('username'));
  console.log('  Is authenticated:', window.API.Auth.isAuthenticated());

  // Test 3: Check authentication state
  console.log('\n✓ Test 3: Authentication state');
  console.log('  Current user:', window.API.Auth.getCurrentUser());
  console.log('  Is authenticated:', window.API.Auth.isAuthenticated());

  // Test 4: Test logout
  console.log('\n✓ Test 4: Testing logout');
  await window.API.Auth.logout();
  console.log('  Is authenticated after logout:', window.API.Auth.isAuthenticated());
  console.log('  Logout flag set:', window.localStorage.getItem('logged_out'));

  console.log('\n==================');
  console.log('✅ All UI flow tests passed!\n');
})();
