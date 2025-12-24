// ===== DATA =====
let POSTS = [];

// ===== STATE =====
let currentPostIndex = 0;
let currentUsername = null;

// ===== DOM UTILITIES =====
const DOM = {
  get: (id) => document.getElementById(id),
  getAll: (selector) => document.querySelectorAll(selector),
  create: (tag, className = '', content = '') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) el.textContent = content;
    return el;
  }
};

// ===== CONTENT RENDERING =====
const ContentRenderer = {
  createEntryLink(item) {
    const link = DOM.create('a', 'toc-entry');
    link.href = `#${item.slug}`;

    const title = DOM.create('span', 'toc-title', item.title);
    const meta = DOM.create('div', 'toc-meta');
    const tags = DOM.create('span', 'toc-chapter', Array.isArray(item.tags) ? item.tags.join(', ') : item.tags);
    const date = DOM.create('span', 'toc-date', item.date);

    meta.append(tags, date);
    link.append(title, meta);
    return link;
  },

  renderList(items, containerId) {
    const container = DOM.get(containerId);
    container.innerHTML = '';

    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(item => container.appendChild(this.createEntryLink(item)));
  }
};

// ===== PAGE NAVIGATION =====
const PageNavigation = {
  goBack() {
    window.location.href = '/';
  }
};

// ===== POST LOADER =====
const PostLoader = {
  load(slug) {
    const post = this.findPost(slug);
    if (!post.item) return;

    currentPostIndex = post.index;

    fetch(post.item.file)
      .then(r => r.text())
      .then(md => this.displayPost(post.item, md));
  },

  findPost(slug) {
    const item = POSTS.find(p => p.slug === slug);
    const index = POSTS.indexOf(item);

    return { item, index };
  },

  displayPost(post, markdown) {
    this.setPostContent(post, markdown);
    window.scrollTo(0, 0);

    if (window.MathJax) {
      MathJax.typesetPromise();
    }
  },

  setPostContent(post, markdown) {
    const html = toHTMLLine(markdown);
    DOM.get('markdown-output').innerHTML = html;
    DOM.get('article-chapter').textContent = Array.isArray(post.tags) ? post.tags.join(' • ') : (post.tags || post.chapter || '');
    DOM.get('article-title').textContent = post.title;
    DOM.get('article-date').textContent = post.date || '';

    // Apply syntax highlighting if there are code blocks
    if (window.Prism) {
      Prism.highlightAll();
    }

    // Render math if MathJax is available
    if (window.MathJax && window.MathJax.typesetPromise) {
      MathJax.typesetPromise();
    }
  },

  navigatePost(direction) {
    const newIndex = currentPostIndex + direction;
    if (newIndex >= 0 && newIndex < POSTS.length) {
      window.location.hash = POSTS[newIndex].slug;
    }
  }
};

// ===== ROUTING =====
const Router = {
  handleHashRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '');

    if (hash) {
      const postExists = POSTS.some(p => p.slug === hash);

      if (postExists) {
        // Navigate to article page with hash
        if (!window.location.pathname.includes('article.html')) {
          window.location.href = `/article.html#${hash}`;
        } else {
          PostLoader.load(hash);
        }
      } else {
        // Article doesn't exist, show 404
        show404Page('Article not found', `The article "${hash}" does not exist.`);
      }
    }
  },

  handleArticlePage() {
    const hash = window.location.hash.replace(/^#\/?/, '');

    if (hash) {
      const postExists = POSTS.some(p => p.slug === hash);
      if (postExists) {
        PostLoader.load(hash);
      } else {
        // Article doesn't exist, show 404
        show404Page('Article not found', `The article "${hash}" does not exist.`);
      }
    } else {
      window.location.href = '/';
    }
  }
};

// ===== GLOBAL FUNCTIONS (for inline handlers) =====
function goBack() {
  PageNavigation.goBack();
}

function prevPost() {
  PostLoader.navigatePost(-1);
}

function nextPost() {
  PostLoader.navigatePost(1);
}

// ===== INITIALIZATION =====
window.addEventListener('hashchange', () => {
  if (window.location.pathname.includes('article.html')) {
    Router.handleArticlePage();
  } else {
    Router.handleHashRoute();
  }
});

// ===== LOAD ARTICLES FROM API =====
async function loadArticles() {
  // Get username from subdomain
  currentUsername = SubdomainUtils.getUsername();

  console.log('Current username from subdomain:', currentUsername);
  console.log('Current hostname:', window.location.hostname);

  if (!currentUsername) {
    // No subdomain, don't load articles
    console.log('No subdomain detected');
    return;
  }

  // Fetch articles from API
  const articles = await API.Articles.getAll(currentUsername);

  console.log('Articles loaded:', articles);

  // Check if user exists (for server mode) - if API returns null (404), show 404 page
  if (CONFIG.storage !== 'localStorage' && articles === null) {
    console.log('User not found, showing 404');
    show404Page();
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('No articles found for user');
  }

  // Convert to POSTS format
  POSTS = articles.map(article => ({
    file: null, // We'll load from markdown content directly
    title: article.title,
    slug: article.slug || article.id,
    tags: article.chapter ? [article.chapter] : [],
    date: article.date,
    markdown: article.markdown, // Store markdown directly
    id: article.id
  }));

  // Update title
  DOM.get('main-title').textContent = currentUsername;

  // Render posts
  const mainPage = DOM.get('main-page');
  if (mainPage) {
    ContentRenderer.renderList(POSTS, 'main-page');
    Router.handleHashRoute();
  }

  // Show builder button if user owns this subdomain
  if (Auth.isAuthenticated() && Auth.getCurrentUser() === currentUsername) {
    const builderBtn = DOM.get('builder-mode-btn');
    if (builderBtn) {
      builderBtn.style.display = 'inline-block';
      builderBtn.addEventListener('click', () => {
        window.location.href = '/builder.html';
      });
    }
  }
}

function show404Page(title = 'User not found', message = null) {
  const defaultMessage = message || `The user "${currentUsername}" does not exist.`;

  // Check if we're on article page
  const articlePage = !DOM.get('main-page');

  if (articlePage) {
    // Article page - show 404 in content area
    const output = DOM.get('markdown-output');
    if (output) {
      output.innerHTML = `
        <div style="text-align: center; padding: 4em 2em;">
          <p style="font-size: 1.1em; color: rgba(0,0,0,0.6); margin: 2em 0;">${defaultMessage}</p>
          <a href="/" style="color: #2c5aa0; text-decoration: underline; margin-top: 2em; display: inline-block;">Go to homepage</a>
        </div>
      `;
    }
    const articleTitle = DOM.get('article-title');
    if (articleTitle) {
      articleTitle.textContent = '404 - Not Found';
    }
    const articleChapter = DOM.get('article-chapter');
    if (articleChapter) {
      articleChapter.textContent = '';
    }
    const articleDate = DOM.get('article-date');
    if (articleDate) {
      articleDate.textContent = '';
    }
  } else {
    // Homepage - show 404 in main page
    const mainPage = DOM.get('main-page');
    if (mainPage) {
      mainPage.innerHTML = `
        <div style="text-align: center; padding: 4em 2em;">
          <p style="font-size: 1.1em; color: rgba(0,0,0,0.6); margin: 2em 0;">${defaultMessage}</p>
          <a href="/" style="color: #2c5aa0; text-decoration: underline; margin-top: 2em; display: inline-block;">Go to homepage</a>
        </div>
      `;
    }
    const mainTitle = DOM.get('main-title');
    if (mainTitle) {
      mainTitle.textContent = '404 - Not Found';
    }
  }
}

// ===== MODIFIED POST LOADER TO USE STORED MARKDOWN =====
const OriginalPostLoader = PostLoader.load;
PostLoader.load = function(slug) {
  const post = this.findPost(slug);
  if (!post.item) return;

  currentPostIndex = post.index;

  // If markdown is stored, use it directly
  if (post.item.markdown) {
    this.displayPost(post.item, post.item.markdown);
  } else if (post.item.file) {
    // Otherwise fetch from file
    fetch(post.item.file)
      .then(r => r.text())
      .then(md => this.displayPost(post.item, md));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const mainPage = DOM.get('main-page');

  if (mainPage) {
    // Homepage: load articles from API
    loadArticles();
  } else {
    // Article page: load post from hash
    loadArticles().then(() => {
      Router.handleArticlePage();
    });
  }
});