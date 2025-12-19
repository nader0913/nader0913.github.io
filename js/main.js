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
    DOM.get('article-chapter').textContent = Array.isArray(post.tags) ? post.tags.join(' • ') : post.tags;
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
      }
    }
  },

  handleArticlePage() {
    const hash = window.location.hash.replace(/^#\/?/, '');

    if (hash) {
      PostLoader.load(hash);
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

document.addEventListener('DOMContentLoaded', () => {
  const mainPage = DOM.get('main-page');

  if (mainPage) {
    // Homepage: render post list
    ContentRenderer.renderList(POSTS, 'main-page');
    Router.handleHashRoute();
  } else {
    // Article page: load post from hash
    Router.handleArticlePage();
  }
});