// ===== INDEX PAGE ROUTER & AUTH =====

const UI = {
  landingContent: document.getElementById('landing-content'),
  viewerContent: document.getElementById('viewer-content'),
  loginForm: document.getElementById('login-form'),
  signupForm: document.getElementById('signup-form'),
  loginError: document.getElementById('login-error'),
  signupError: document.getElementById('signup-error'),

  showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
  },

  hideError(element) {
    if (!element) return;
    element.classList.remove('show');
  },

  showLanding() {
    this.landingContent.style.display = 'block';
    this.viewerContent.style.display = 'none';
  },

  showViewer() {
    this.landingContent.style.display = 'none';
    this.viewerContent.style.display = 'block';
  }
};

// ===== TAB SWITCHING =====
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;

    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`${targetTab}-form`).classList.add('active');

    UI.hideError(UI.loginError);
    UI.hideError(UI.signupError);
  });
});

// ===== LOGIN HANDLER =====
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    UI.hideError(UI.loginError);

    if (!username || !password) {
      UI.showError(UI.loginError, 'Please fill in all fields');
      return;
    }

    const result = await API.Auth.login(username, password);

    if (result.success) {
      // Pass token in URL for cross-subdomain auth
      const token = API.Auth.getToken();
      window.location.href = `http://${username}.localhost:8080?token=${encodeURIComponent(token)}&user=${encodeURIComponent(username)}`;
    } else {
      UI.showError(UI.loginError, result.error || 'Login failed');
    }
  });
}

// ===== SIGNUP HANDLER =====
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    UI.hideError(UI.signupError);

    if (!username || !email || !password) {
      UI.showError(UI.signupError, 'Please fill in all fields');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      UI.showError(UI.signupError, 'Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    const result = await API.Auth.signup(username, password, email);

    if (result.success) {
      // Pass token in URL for cross-subdomain auth
      const token = API.Auth.getToken();
      window.location.href = `http://${username}.localhost:8080?token=${encodeURIComponent(token)}&user=${encodeURIComponent(username)}`;
    } else {
      UI.showError(UI.signupError, result.error || 'Signup failed');
    }
  });
}

// ===== LOAD ARTICLES =====
async function loadArticles(username) {
  const articles = await API.Articles.getAll(username);

  // Check if user exists (articles will be null for 404)
  if (articles === null) {
    show404Page('User not found', `The user "${username}" does not exist.`);
    return;
  }

  // Update title
  document.getElementById('main-title').textContent = username;

  // Render articles list
  const mainPage = document.getElementById('main-page');
  mainPage.innerHTML = '';

  // Filter to show only published articles
  const publishedArticles = articles.filter(article => article.published !== false);

  publishedArticles.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(article => {
    const link = document.createElement('a');
    link.className = 'toc-entry';
    link.href = `#${article.slug || article.id}`;

    // Add click handler to show article
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showArticle(article);
    });

    const title = document.createElement('span');
    title.className = 'toc-title';
    title.textContent = article.title;

    const meta = document.createElement('div');
    meta.className = 'toc-meta';

    const tags = document.createElement('span');
    tags.className = 'toc-chapter';
    tags.textContent = article.chapter || '';

    const date = document.createElement('span');
    date.className = 'toc-date';
    date.textContent = article.date || '';

    meta.append(tags, date);
    link.append(title, meta);
    mainPage.appendChild(link);
  });

  // Show builder and logout buttons if user owns this subdomain
  const builderBtn = document.getElementById('builder-mode-btn');
  const logoutBtn = document.getElementById('logout-btn');

  if (Auth.isAuthenticated() && Auth.getCurrentUser() === username) {
    if (builderBtn) {
      builderBtn.style.display = 'inline-block';
      builderBtn.onclick = () => {
        window.location.href = '/builder.html';
      };
    }

    if (logoutBtn) {
      logoutBtn.style.display = 'inline-block';
      logoutBtn.onclick = () => {
        Auth.logout();
        // Redirect to homepage with logout flag to clear auth there too
        window.location.replace('http://localhost:8080?logout=1');
      };
    }
  }
}

// ===== 404 PAGE =====
function show404Page(title = 'User not found', message = 'The user does not exist.') {
  const mainPage = document.getElementById('main-page');
  if (mainPage) {
    mainPage.innerHTML = `
      <div style="text-align: center; padding: 4em 2em;">
        <p style="font-size: 1.1em; color: rgba(0,0,0,0.6); margin: 2em 0;">${message}</p>
        <a href="http://localhost:8080" style="color: #2c5aa0; text-decoration: underline; margin-top: 2em; display: inline-block;">Go to homepage</a>
      </div>
    `;
  }
  const mainTitle = document.getElementById('main-title');
  if (mainTitle) {
    mainTitle.textContent = '404 - Not Found';
  }

  // Hide builder and logout buttons
  const builderBtn = document.getElementById('builder-mode-btn');
  const logoutBtn = document.getElementById('logout-btn');
  if (builderBtn) builderBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';
}

// ===== ARTICLE VIEWING =====
function showArticle(article) {
  const listView = document.getElementById('list-view');
  const articleView = document.getElementById('article-view');

  // Hide article list, show clean article view
  listView.style.display = 'none';
  articleView.style.display = 'block';

  // Set article content
  document.getElementById('article-title').textContent = article.title;
  document.getElementById('article-chapter').textContent = article.chapter || '';
  document.getElementById('article-date').textContent = article.date || '';

  // Render markdown
  const html = toHTMLLine(article.content || article.markdown || '');
  document.getElementById('markdown-output').innerHTML = html;

  // Scroll to top
  window.scrollTo(0, 0);

  // Apply syntax highlighting
  if (window.Prism) {
    Prism.highlightAll();
  }

  // Render math
  if (window.MathJax && window.MathJax.typesetPromise) {
    MathJax.typesetPromise();
  }
}

function hideArticle() {
  const listView = document.getElementById('list-view');
  const articleView = document.getElementById('article-view');

  // Show article list, hide article view
  listView.style.display = 'block';
  articleView.style.display = 'none';

  // Scroll to top
  window.scrollTo(0, 0);
}

// ===== ROUTER =====
window.addEventListener('DOMContentLoaded', async () => {
  const subdomain = SubdomainUtils.getUsername();
  const urlParams = new URLSearchParams(window.location.search);

  // Handle logout request
  if (urlParams.get('logout') === '1') {
    Auth.logout();
    // Clean up URL and show landing
    window.history.replaceState({}, document.title, window.location.pathname);
    UI.showLanding();
    return;
  }

  // Check for auth token in URL (for cross-subdomain login)
  const tokenFromUrl = urlParams.get('token');
  const userFromUrl = urlParams.get('user');

  if (tokenFromUrl && userFromUrl) {
    localStorage.setItem('auth_token', tokenFromUrl);
    localStorage.setItem('username', userFromUrl);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (subdomain) {
    // On user subdomain - show viewer
    UI.showViewer();
    await loadArticles(subdomain);
  } else {
    // On main domain
    // If logged in, redirect to user's subdomain
    if (Auth.isAuthenticated()) {
      const username = Auth.getCurrentUser();
      const token = API.Auth.getToken();
      window.location.href = `http://${username}.localhost:8080?token=${encodeURIComponent(token)}&user=${encodeURIComponent(username)}`;
    } else {
      // Not logged in - show landing
      UI.showLanding();
    }
  }
});
