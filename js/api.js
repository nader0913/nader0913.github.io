// ===== API ABSTRACTION LAYER =====
// Handles both localStorage and server storage seamlessly

const API = {
  // ===== STORAGE KEYS =====
  KEYS: {
    ARTICLES: 'builder_articles',
    CURRENT_USER: 'current_user'
  },

  // ===== AUTHENTICATION =====
  Auth: {
    /**
     * Read username from cookie (set by server)
     */
    _getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
      return null;
    },

    async login(username, password) {
      if (CONFIG.storage === 'localStorage') {
        // Mock login for localStorage mode
        const user = { username };
        localStorage.setItem('username', username);
        return { success: true, user };
      }

      // Server mode
      try {
        const response = await fetch(`${CONFIG.api.endpoint}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Cookie is automatically set by server
          return { success: true, user: data };
        }

        return { success: false, error: data.error || 'Login failed' };
      } catch (error) {
        return { success: false, error: 'Network error' };
      }
    },

    async signup(username, password, email) {
      if (CONFIG.storage === 'localStorage') {
        // Mock signup for localStorage mode
        const user = { username, email };
        localStorage.setItem('username', username);
        return { success: true, user };
      }

      // Server mode
      try {
        const response = await fetch(`${CONFIG.api.endpoint}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies
          body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (response.ok) {
          // Cookie is automatically set by server
          return { success: true, user: data };
        }

        return { success: false, error: data.error || 'Signup failed' };
      } catch (error) {
        return { success: false, error: 'Network error' };
      }
    },

    async logout() {
      if (CONFIG.storage === 'localStorage') {
        // LocalStorage mode - just clear storage
        localStorage.clear();
        sessionStorage.clear();
        return;
      }

      // Server mode - call logout API to clear cookies
      try {
        await fetch(`${CONFIG.api.endpoint}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }

      // Clear localStorage (for localStorage mode compatibility)
      localStorage.clear();
      sessionStorage.clear();
    },

    isAuthenticated() {
      // Check if username cookie exists
      const username = this.getCurrentUser();
      return !!username;
    },

    getCurrentUser() {
      // Read directly from cookie - no API call!
      if (CONFIG.storage === 'localStorage') {
        return localStorage.getItem('username');
      }
      return this._getCookie('username');
    }
  },

  // ===== ARTICLES =====
  Articles: {
    async getAll(username = null) {
      const user = username || API.Auth.getCurrentUser();

      if (CONFIG.storage === 'localStorage') {
        // LocalStorage mode
        const stored = localStorage.getItem(API.KEYS.ARTICLES);
        if (!stored) return [];

        const allArticles = JSON.parse(stored);

        // Filter by user if multiUser is enabled
        if (CONFIG.features.multiUser && user) {
          return allArticles.filter(article => article.owner === user);
        }

        return allArticles;
      }

      // Server mode
      try {
        const response = await fetch(`${CONFIG.api.endpoint}/articles/${user}`, {
          credentials: 'include'
        });

        console.log('API Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('API Response data:', data);
          return data.articles || [];
        }

        // Return null for 404 (user not found), empty array for other errors
        if (response.status === 404) {
          console.log('Returning null for 404');
          return null;
        }

        return [];
      } catch (error) {
        console.error('Failed to fetch articles:', error);
        return [];
      }
    },

    async save(article) {
      const user = API.Auth.getCurrentUser();

      if (CONFIG.storage === 'localStorage') {
        // LocalStorage mode
        const stored = localStorage.getItem(API.KEYS.ARTICLES) || '[]';
        let articles = JSON.parse(stored);

        // Add owner if multiUser is enabled
        if (CONFIG.features.multiUser && user) {
          article.owner = user;
        }

        const existingIndex = articles.findIndex(a => a.id === article.id);

        if (existingIndex >= 0) {
          articles[existingIndex] = article;
        } else {
          articles.push(article);
        }

        localStorage.setItem(API.KEYS.ARTICLES, JSON.stringify(articles));
        return { success: true, article };
      }

      // Server mode
      try {
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
      } catch (error) {
        return { success: false, error: 'Network error' };
      }
    },

    async delete(articleId) {
      const user = API.Auth.getCurrentUser();

      if (CONFIG.storage === 'localStorage') {
        // LocalStorage mode
        const stored = localStorage.getItem(API.KEYS.ARTICLES) || '[]';
        let articles = JSON.parse(stored);

        // Filter by user if multiUser is enabled
        if (CONFIG.features.multiUser && user) {
          articles = articles.filter(a => !(a.id === articleId && a.owner === user));
        } else {
          articles = articles.filter(a => a.id !== articleId);
        }

        localStorage.setItem(API.KEYS.ARTICLES, JSON.stringify(articles));
        return { success: true };
      }

      // Server mode
      try {
        const response = await fetch(`${CONFIG.api.endpoint}/articles/${user}/${articleId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          return { success: true };
        }

        const data = await response.json();
        return { success: false, error: data.error || 'Delete failed' };
      } catch (error) {
        return { success: false, error: 'Network error' };
      }
    },

    async getById(articleId, username = null) {
      const articles = await this.getAll(username);
      return articles.find(a => a.id === articleId);
    }
  }
};
