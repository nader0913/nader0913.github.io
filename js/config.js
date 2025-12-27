// ===== CONFIGURATION =====
// Single source of truth for the application

const CONFIG = {
  // API Configuration
  api: {
    get endpoint() {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;

      // For localhost development
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
        return 'http://localhost:3000/api';
      }

      // For pluma.local development (simulates production)
      if (hostname.endsWith('.local')) {
        // Always use main domain for API
        return 'http://pluma.local:8080/api';
      }

      // For pages.dev preview - always use main domain
      if (hostname.endsWith('.pages.dev')) {
        const parts = hostname.split('.');
        if (parts.length >= 3) {
          const baseDomain = parts.slice(-3).join('.');
          return `${protocol}//${baseDomain}/api`;
        }
      }

      // Production - always use main domain for API
      return `${protocol}//pluma.ink/api`;
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
    name: 'Pluma',
    get defaultDomain() {
      const hostname = window.location.hostname;

      // For localhost development
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
        return 'localhost:8080';
      }

      // For pluma.local development (simulates production)
      if (hostname.endsWith('.local')) {
        return 'pluma.local:8080';
      }

      // For pages.dev preview
      if (hostname.endsWith('.pages.dev')) {
        // Extract base domain like pluma-a6y.pages.dev
        const parts = hostname.split('.');
        if (parts.length >= 3) {
          return parts.slice(-3).join('.');
        }
      }

      // Production - pluma.ink
      return 'pluma.ink';
    },
    get domain() {
      return this.defaultDomain;
    },
    // Get the cookie domain for the current environment
    get cookieDomain() {
      const hostname = window.location.hostname;

      // For localhost - use localStorage (cookies don't work with .localhost)
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
        return null; // Use localStorage instead
      }

      // For pluma.local - use proper cookie domain
      if (hostname.endsWith('.local')) {
        return '.pluma.local';
      }

      // For pages.dev preview
      if (hostname.endsWith('.pages.dev')) {
        const baseDomain = hostname.split('.').slice(-3).join('.');
        return '.' + baseDomain;
      }

      // Production
      return '.pluma.ink';
    }
  }
};

// ===== SUBDOMAIN UTILITIES =====
const SubdomainUtils = {
  /**
   * Extract username from subdomain
   * alex.domain.com -> 'alex'
   * localhost:8080 -> null (main site)
   * nader0913.pluma.local -> 'nader0913'
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
    // nader0913.pluma.local -> ['nader0913', 'pluma', 'local'] -> return 'nader0913'
    // alex.pluma.ink -> ['alex', 'pluma', 'ink'] -> return 'alex'
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      // Special handling for *.localhost
      const subdomain = parts[0];
      if (subdomain !== 'www') {
        return subdomain;
      }
    } else if (parts.length >= 3) {
      // Regular domain with subdomain (pluma.local, pluma.ink, etc.)
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
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
