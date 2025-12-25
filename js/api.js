// ===== API ABSTRACTION LAYER =====
// Handles both localStorage and server storage seamlessly

const API = {
  // ===== STORAGE KEYS =====
  KEYS: {
    ARTICLES: 'builder_articles',
    CURRENT_USER: 'current_user'
  },

  // ===== COOKIE UTILITIES =====
  Cookies: {
    set(name, value, days = 7) {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    },

    get(name) {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) {
          return c.substring(nameEQ.length);
        }
      }
      return null;
    },

    delete(name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    }
  },

  // ===== AUTHENTICATION =====
  Auth: {
    async login(username, password) {
      if (CONFIG.storage === 'localStorage') {
        // Mock login for localStorage mode
        const user = { username, token: 'mock_token_' + username };
        API.Cookies.set('auth_token', user.token, 7);
        API.Cookies.set('username', username, 7);
        return { success: true, user };
      }

      // Server mode
      try {
        const response = await fetch(`${CONFIG.api.endpoint}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Save to cookies (works across subdomains)
          const domain = CONFIG.app.domain;
          const cookieDomain = domain.includes('localhost') ? 'localhost' : `.${domain}`;
          document.cookie = `auth_token=${data.token};domain=${cookieDomain};path=/;max-age=${7 * 24 * 60 * 60}`;
          document.cookie = `username=${data.username};domain=${cookieDomain};path=/;max-age=${7 * 24 * 60 * 60}`;
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
        const user = { username, email, token: 'mock_token_' + username };
        API.Cookies.set('auth_token', user.token, 7);
        API.Cookies.set('username', username, 7);
        return { success: true, user };
      }

      // Server mode
      try {
        const response = await fetch(`${CONFIG.api.endpoint}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (response.ok) {
          // Save to cookies (works across subdomains)
          const domain = CONFIG.app.domain;
          const cookieDomain = domain.includes('localhost') ? 'localhost' : `.${domain}`;
          document.cookie = `auth_token=${data.token};domain=${cookieDomain};path=/;max-age=${7 * 24 * 60 * 60}`;
          document.cookie = `username=${data.username};domain=${cookieDomain};path=/;max-age=${7 * 24 * 60 * 60}`;
          return { success: true, user: data };
        }

        return { success: false, error: data.error || 'Signup failed' };
      } catch (error) {
        return { success: false, error: 'Network error' };
      }
    },

    logout() {
      const domain = CONFIG.app.domain;
      const cookieDomain = domain.includes('localhost') ? 'localhost' : `.${domain}`;
      document.cookie = `auth_token=;domain=${cookieDomain};path=/;max-age=0`;
      document.cookie = `username=;domain=${cookieDomain};path=/;max-age=0`;
      localStorage.clear();
    },

    isAuthenticated() {
      return !!API.Cookies.get('auth_token');
    },

    getCurrentUser() {
      return API.Cookies.get('username');
    },

    getToken() {
      return API.Cookies.get('auth_token');
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
          headers: {
            'Authorization': `Bearer ${API.Auth.getToken()}`
          }
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API.Auth.getToken()}`
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
          headers: {
            'Authorization': `Bearer ${API.Auth.getToken()}`
          }
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
