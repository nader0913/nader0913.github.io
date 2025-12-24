// ===== AUTHENTICATION & ROUTING =====

const Auth = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return API.Auth.isAuthenticated();
  },

  /**
   * Get current logged-in user
   */
  getCurrentUser() {
    return API.Auth.getCurrentUser();
  },

  /**
   * Require authentication - redirect to login if not authenticated
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/';
      return false;
    }
    return true;
  },

  /**
   * Check if current user owns this subdomain
   */
  checkSubdomainOwnership() {
    const subdomain = SubdomainUtils.getUsername();
    const currentUser = this.getCurrentUser();

    // If on main domain, no ownership needed
    if (!subdomain) return true;

    // User must be logged in and match subdomain
    if (!currentUser || currentUser !== subdomain) {
      return false;
    }

    return true;
  },

  /**
   * Require subdomain ownership for builder mode
   */
  requireOwnership() {
    if (!this.requireAuth()) return false;

    if (!this.checkSubdomainOwnership()) {
      alert('You can only edit your own subdomain');
      window.location.href = '/';
      return false;
    }

    return true;
  },

  /**
   * Logout user
   */
  logout() {
    API.Auth.logout();
    window.location.href = '/';
  }
};

// ===== PAGE ROUTING =====

const PageRouter = {
  /**
   * Determine which page should be shown based on URL
   */
  route() {
    const path = window.location.pathname;
    const isUserSubdomain = SubdomainUtils.isUserSubdomain();

    // On main domain
    if (!isUserSubdomain) {
      if (path === '/' || path === '/index.html') {
        // Show landing page (login/signup)
        return 'landing';
      }
    }

    // On user subdomain
    if (isUserSubdomain) {
      if (path === '/builder.html' || path === '/builder') {
        // Builder mode - requires auth & ownership
        if (Auth.requireOwnership()) {
          return 'builder';
        }
      } else {
        // View mode - public access
        return 'viewer';
      }
    }

    return null;
  },

  /**
   * Navigate to builder mode
   */
  goToBuilder() {
    if (!Auth.isAuthenticated()) {
      alert('Please login first');
      window.location.href = '/';
      return;
    }

    const username = Auth.getCurrentUser();
    const currentSubdomain = SubdomainUtils.getUsername();

    // If already on correct subdomain, just go to builder
    if (currentSubdomain === username) {
      window.location.href = '/builder.html';
    } else {
      // Navigate to user's subdomain builder
      const protocol = window.location.protocol;
      const domain = CONFIG.app.defaultDomain;
      window.location.href = `${protocol}//${username}.${domain}/builder.html`;
    }
  },

  /**
   * Navigate to viewer mode
   */
  goToViewer(username = null) {
    const user = username || Auth.getCurrentUser();

    if (!user) {
      window.location.href = '/';
      return;
    }

    const protocol = window.location.protocol;
    const domain = CONFIG.app.defaultDomain;
    window.location.href = `${protocol}//${user}.${domain}/`;
  }
};
