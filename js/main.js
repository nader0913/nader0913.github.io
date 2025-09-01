// ===== DATA =====
const POSTS = [
  { file: 'articles/pareto-distribution.md', title: 'Pareto Distribution and Wealth Disparity', slug: 'pareto-distribution', tags: ['Distributions'], date: 'Jul 23, 2021' },
  { file: 'articles/baader-meinhof-phenomenon.md', title: 'Baader Meinhof Phenomenon', slug: 'baader-meinhof-phenomenon', tags: ['Phenomenons'], date: '10 Dec, 2023' },
  { file: 'articles/goldilocks-rule-and-flow-state.md', title: 'Goldilocks Rule and Flow State', slug: 'goldilocks-rule-and-flow-state', tags: ['Phenomenons'], date: '24 Nov, 2024' },
  { file: 'articles/homomorphic-encryption.md', title: 'Homomorphic Encryption for Dummies', slug: 'homomorphic-encryption', tags: ['Cryptography'], date: 'Nov 12, 2023' },
  { file: 'articles/shamir-secret-sharing.md', title: 'Shamir Secret Sharing', slug: 'shamir-secret-sharing', tags: ['Cryptography'], date: 'Nov 12, 2023' },
  { file: 'articles/plain-english.md', title: 'How to write in Plain English', slug: 'plain-english', tags: ['Writing'], date: 'Aug 19, 2025' },
];

const PROJECTS = [
  { file: 'articles/veilcomm.md', title: 'Veilcomm - Partial Tor Network Implementation in Rust', slug: 'veilcomm', tags: ['Privacy', 'Rust'], date: 'Nov, 2024' }
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
  show(pageId, element) {
    this.hideAllPages();
    this.clearActiveNav();
    this.showPage(pageId);
    this.setActiveNav(element);

    if (pageId === 'projects') {
      ContentRenderer.renderList(PROJECTS, 'projects-list');
    }
    return false;
  },

  hideAllPages() {
    DOM.getAll('.page-content').forEach(page => {
      page.style.display = 'none';
      page.classList.remove('active');
    });
  },

  clearActiveNav() {
    DOM.getAll('.nav-item').forEach(nav => nav.classList.remove('active'));
  },

  showPage(pageId) {
    const page = DOM.get(`${pageId}-page`);
    if (page) {
      page.style.display = 'block';
      page.classList.add('active');
    }
  },

  setActiveNav(element) {
    if (element) element.classList.add('active');
  },

  goBack() {
    DOM.get('post-content').style.display = 'none';
    DOM.get('main-title').style.display = 'block';
    DOM.get('main-nav').style.display = 'flex';
    document.querySelector('.page-content.active').style.display = 'block';

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
    let item = POSTS.find(p => p.slug === slug);
    let index = POSTS.indexOf(item);
    let isProject = false;

    if (!item) {
      item = PROJECTS.find(p => p.slug === slug);
      index = PROJECTS.indexOf(item);
      isProject = true;
    }

    return { item, index, isProject };
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
    DOM.get('main-nav').style.display = 'none';
    DOM.get('main-title').style.display = 'none';
    document.querySelector('.page-content.active').style.display = 'none';
  },

  showPostUI() {
    DOM.get('post-content').style.display = 'block';
  },

  setPostContent(post, markdown) {
    DOM.get('markdown-output').innerHTML = MarkdownParser.parse(markdown);
    DOM.get('article-chapter').textContent = Array.isArray(post.tags) ? post.tags.join(' • ') : post.tags;
    DOM.get('article-title').textContent = post.title;
    DOM.get('article-date').textContent = post.date || '';
  },

  navigatePost(direction) {
    const newIndex = currentPostIndex + direction;
    if (newIndex >= 0 && newIndex < POSTS.length) {
      Router.navigateTo(POSTS[newIndex].slug);
    }
  }
};

// ===== MARKDOWN PARSER =====
const MarkdownParser = {
  parse(md) {
    md = md.replace(/\\\$/g, 'ESCAPED_DOLLAR_SIGN');

    const blocks = md.split(/\n{2,}/).map(block => this.parseBlock(block.trim()));

    let html = blocks.join('\n\n')
      .replace(/^### (.*$)/gim, '<div class="article-subsubheader">$1</div>')
      .replace(/^## (.*$)/gim, '<div class="article-subheader">$1</div>')
      .replace(/^# (.*$)/gim, '<div class="article-header">$1</div>')
      .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
      .replace(/\*(.*?)\*/gim, '<i>$1</i>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<div class="article-image"><img alt="$1" src="$2"><p>$1</p></div>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
      .replace(/^>\s?(.*)$/gim, '<div class="article-blockquote">$1</div>');

    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => `<div class="article-math">$$${expr}$$</div>`);
    html = html.replace(/\$(.+?)\$/g, (_, expr) => `\\(${expr}\\)`);
    html = html.replace(/ESCAPED_DOLLAR_SIGN/g, '$');

    if (window.MathJax) {
      MathJax.typesetPromise([html]).then(() => {
        DOM.get('markdown-output').innerHTML = html;
      });
    }

    return html;
  },

  parseBlock(block) {
    if (/^\|.+\n\|[-:| ]+\n?/.test(block)) {
      return this.parseTable(block);
    }

    if (/^\s*\d+\.\s+/.test(block)) {
      return this.parseOrderedList(block);
    }

    if (/^\s*-\s+/.test(block)) {
      return this.parseUnorderedList(block);
    }

    const isSpecialBlock = block.startsWith('> ') || block.startsWith('#') ||
      block.startsWith('<div') || block.startsWith('<blockquote') ||
      block.startsWith('<img') || block.startsWith('$$') ||
      block.includes('![');

    return isSpecialBlock ? block : `<div class="article-paragraph">${block}</div>`;
  },

  parseOrderedList(block) {
    const items = block.split('\n')
      .map(line => {
        const match = line.match(/^\s*\d+\.\s+(.*)$/);
        return match ? `<li>${match[1]}</li>` : '';
      })
      .join('');
    return `<div class="article-list"><ol>${items}</ol></div>`;
  },

  parseUnorderedList(block) {
    const items = block.split('\n')
      .map(line => {
        const match = line.match(/^\s*-\s+(.*)$/);
        return match ? `<li>${match[1]}</li>` : '';
      })
      .join('');
    return `<div class="article-list"><ul>${items}</ul></div>`;
  },

  parseTable(tableMd) {
    const lines = tableMd.trim().split('\n');
    const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
    const rows = lines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

    let html = '<div class="article-table"><table><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach(cells => {
      html += '<tr>';
      cells.forEach(c => html += `<td>${c}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
  }
};

// ===== ROUTING =====
const Router = {
  navigateTo(slug) {
    // Use hash routing for compatibility with simple servers
    const newUrl = `/#/${slug}`;
    window.location.hash = `#/${slug}`;
    PostLoader.load(slug);
  },

  handleRoute() {
    const path = window.location.pathname;
    const slug = path.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes

    if (slug && slug !== '') {
      // Check if slug exists in posts or projects
      const postExists = POSTS.some(p => p.slug === slug) || PROJECTS.some(p => p.slug === slug);

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
function showPage(pageId, element) {
  return PageNavigation.show(pageId, element);
}

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