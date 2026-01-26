// Simple static blog - loads articles from articles.json

let articlesData = [];
let publishedArticles = [];
let currentArticleIndex = -1;

// Load and display articles
async function loadArticles() {
  try {
    const response = await fetch('articles.json');
    articlesData = await response.json();

    // Filter published articles and sort by date
    publishedArticles = articlesData
      .filter(article => article.published !== false)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    displayArticleList(publishedArticles);
  } catch (error) {
    console.error('Error loading articles:', error);
    document.getElementById('main-page').innerHTML = '<p>Error loading articles</p>';
  }
}

// Display article list
function displayArticleList(articles) {
  const mainPage = document.getElementById('main-page');
  mainPage.innerHTML = '';

  articles.forEach(article => {
    const link = document.createElement('a');
    link.className = 'toc-entry';
    link.href = `#${article.slug}`;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      showArticle(article);
    });

    const title = document.createElement('span');
    title.className = 'toc-title';
    title.textContent = article.title;

    const meta = document.createElement('div');
    meta.className = 'toc-meta';

    const chapter = document.createElement('span');
    chapter.className = 'toc-chapter';
    chapter.textContent = article.chapter || '';

    const date = document.createElement('span');
    date.className = 'toc-date';
    date.textContent = article.date || '';

    meta.append(chapter, date);
    link.append(title, meta);
    mainPage.appendChild(link);
  });
}

// Show article
async function showArticle(article) {
  const listView = document.getElementById('list-view');
  const articleView = document.getElementById('article-view');

  // Find current article index
  currentArticleIndex = publishedArticles.findIndex(a => a.id === article.id);

  // Hide list, show article
  listView.style.display = 'none';
  articleView.style.display = 'block';

  // Set article metadata
  document.getElementById('article-title').textContent = article.title;
  document.getElementById('article-chapter').textContent = article.chapter || '';
  document.getElementById('article-date').textContent = article.date || '';
  document.title = `${article.title} - nader0913`;

  // Update navigation button states
  updateNavigationButtons();

  // Load and render markdown
  try {
    const response = await fetch(`articles/${article.file}`);
    const markdown = await response.text();
    const html = toHTMLLine(markdown);
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
  } catch (error) {
    console.error('Error loading article:', error);
    document.getElementById('markdown-output').innerHTML = '<p>Error loading article content</p>';
  }
}

// Hide article and return to list
function hideArticle() {
  const listView = document.getElementById('list-view');
  const articleView = document.getElementById('article-view');

  listView.style.display = 'block';
  articleView.style.display = 'none';

  document.title = 'nader0913';
  window.scrollTo(0, 0);
}

// Navigate to previous article
function prevArticle() {
  if (currentArticleIndex > 0) {
    showArticle(publishedArticles[currentArticleIndex - 1]);
  }
}

// Navigate to next article
function nextArticle() {
  if (currentArticleIndex < publishedArticles.length - 1) {
    showArticle(publishedArticles[currentArticleIndex + 1]);
  }
}

// Update navigation button states
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (prevBtn) {
    if (currentArticleIndex <= 0) {
      prevBtn.style.opacity = '0.3';
      prevBtn.style.pointerEvents = 'none';
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    }
  }

  if (nextBtn) {
    if (currentArticleIndex >= publishedArticles.length - 1) {
      nextBtn.style.opacity = '0.3';
      nextBtn.style.pointerEvents = 'none';
    } else {
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  loadArticles();
});
