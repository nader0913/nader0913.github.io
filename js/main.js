// ===== DATA =====
const POSTS = [
  { file: 'articles/pareto-distribution.md', title: 'Pareto Distribution and Wealth Disparity', slug: 'pareto-distribution', tags: ['Distributions'], date: 'Jul 23, 2021' },
  { file: 'articles/baader-meinhof-phenomenon.md', title: 'Baader Meinhof Phenomenon', slug: 'baader-meinhof-phenomenon', tags: ['Phenomenons'], date: 'Dec 10, 2023' },
  { file: 'articles/goldilocks-rule-and-flow-state.md', title: 'Goldilocks Rule and Flow State', slug: 'goldilocks-rule-and-flow-state', tags: ['Phenomenons'], date: 'Nov 24, 2024' },
  { file: 'articles/homomorphic-encryption.md', title: 'Homomorphic Encryption for Dummies', slug: 'homomorphic-encryption', tags: ['Cryptography'], date: 'Nov 12, 2023' },
  { file: 'articles/shamir-secret-sharing.md', title: 'Shamir Secret Sharing', slug: 'shamir-secret-sharing', tags: ['Cryptography'], date: 'Nov 12, 2023' },
  { file: 'articles/plain-english.md', title: 'How to write in Plain English', slug: 'plain-english', tags: ['Writing'], date: 'Aug 19, 2025' },
  { file: 'articles/veilcomm.md', title: '[Project] Veilcomm - Partial Tor Network Implementation in Rust', slug: 'veilcomm', tags: ['Privacy', 'Rust'], date: 'Nov 20, 2024' }
];

// ===== STATE =====
let currentPostIndex = 0;

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
    link.href = `/#/${item.slug}`;
    link.target = '_blank';
    link.onclick = this.handleEntryClick(item.slug);

    const title = DOM.create('span', 'toc-title', item.title);
    const meta = DOM.create('div', 'toc-meta');
    const tags = DOM.create('span', 'toc-chapter', Array.isArray(item.tags) ? item.tags.join(', ') : item.tags);
    const date = DOM.create('span', 'toc-date', item.date);

    meta.append(tags, date);
    link.append(title, meta);
    return link;
  },

  handleEntryClick(slug) {
    return (e) => {
      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        Router.navigateTo(slug);
        return false;
      }
    };
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
    DOM.get('post-content').style.display = 'none';
    DOM.get('main-title').style.display = 'block';
    DOM.get('blog-page').style.display = 'block';

    // Update URL to root
    if (window.location.pathname !== '/') {
      history.pushState({}, '', '/');
    }
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
    this.hideMainUI();
    this.showPostUI();
    this.setPostContent(post, markdown);
    window.scrollTo(0, 0);

    if (window.MathJax) {
      MathJax.typesetPromise();
    }
  },

  hideMainUI() {
    DOM.get('main-title').style.display = 'none';
    DOM.get('blog-page').style.display = 'none';
  },

  showPostUI() {
    DOM.get('post-content').style.display = 'block';
  },

  setPostContent(post, markdown) {
    const { html, languages } = toHTML(markdown);
    DOM.get('markdown-output').innerHTML = html;
    DOM.get('article-chapter').textContent = Array.isArray(post.tags) ? post.tags.join(' • ') : post.tags;
    DOM.get('article-title').textContent = post.title;
    DOM.get('article-date').textContent = post.date || '';

    // Apply syntax highlighting if there are code blocks
    if (languages.length > 0 && window.Prism) {
      Prism.highlightAll();
    }
  },

  navigatePost(direction) {
    const newIndex = currentPostIndex + direction;
    if (newIndex >= 0 && newIndex < POSTS.length) {
      Router.navigateTo(POSTS[newIndex].slug);
    }
  }
};

// ===== ROUTING =====
const Router = {
  navigateTo(slug) {
    // Use hash routing for compatibility with simple servers
    window.location.hash = `#/${slug}`;
    PostLoader.load(slug);
  },

  handleRoute() {
    const path = window.location.pathname;
    const slug = path.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes

    if (slug && slug !== '') {
      // Check if slug exists in posts
      const postExists = POSTS.some(p => p.slug === slug);

      if (postExists) {
        PostLoader.load(slug);
      } else {
        // Slug doesn't exist, redirect to home
        console.warn(`Article "${slug}" not found, redirecting to home`);
        this.navigateToHome();
      }
    } else {
      // Home page or empty slug
      this.showHomePage();
    }
  },

  navigateToHome() {
    history.replaceState({}, '', '/');
    this.showHomePage();
  },

  showHomePage() {
    PageNavigation.goBack();
  },

  handleHashChange() {
    // Legacy hash support - redirect to clean URLs
    const slug = window.location.hash.replace(/^#\/?/, '');
    if (slug) {
      this.navigateTo(slug);
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
window.addEventListener('hashchange', Router.handleHashChange);
window.addEventListener('popstate', (e) => {
  if (e.state?.slug) {
    PostLoader.load(e.state.slug);
  } else {
    Router.handleRoute();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Render blog content first
  ContentRenderer.renderList(POSTS, 'main-page');

  // Initialize page visibility
  DOM.getAll('.page-content').forEach(page => page.style.display = 'none');
  DOM.get('blog-page').style.display = 'block';

  // Handle initial route - check hash first, then path
  if (window.location.hash) {
    Router.handleHashChange();
  } else {
    Router.handleRoute();
  }
});