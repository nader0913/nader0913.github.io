// ===== CONFIGURATION =====
// Single source of truth for the application

const CONFIG = {
  // API Configuration
  api: {
    get endpoint() {
      // Always use localhost:3000 for API
      return 'http://localhost:3000/api';
    }
  },

  // Storage Strategy
  storage: 'server', // 'localStorage' | 'server'

  // Feature Flags
  features: {
    multiUser: true,
    authentication: true,
    subdomains: true
  },

  // App Settings
  app: {
    name: 'Article Platform',
    defaultDomain: 'localhost:8080', // Your local dev domain
    // For production: 'yourdomain.com'
  }
};

// ===== SUBDOMAIN UTILITIES =====
const SubdomainUtils = {
  /**
   * Extract username from subdomain
   * alex.domain.com -> 'alex'
   * localhost:8080 -> null (main site)
   */
  getUsername() {
    const hostname = window.location.hostname;

    // Handle plain localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }

    const parts = hostname.split('.');

    // Check for subdomain
    // nader0913.localhost -> ['nader0913', 'localhost'] -> return 'nader0913'
    // alex.domain.com -> ['alex', 'domain', 'com'] -> return 'alex'
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      // Special handling for *.localhost
      return parts[0];
    } else if (parts.length >= 3) {
      // Regular domain with subdomain
      return parts[0];
    }

    return null;
  },

  /**
   * Check if we're on a user's subdomain
   */
  isUserSubdomain() {
    return this.getUsername() !== null;
  },

  /**
   * Check if we're on the main domain
   */
  isMainDomain() {
    return this.getUsername() === null;
  }
};
