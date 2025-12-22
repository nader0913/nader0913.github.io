const ARTICLE_COMPONENT_TYPES = {
  paragraph: { tag: 'p', className: '', placeholder: 'Start writing...' },
  header: { tag: 'h2', className: '', placeholder: 'Header text' },
  subheader: { tag: 'h3', className: '', placeholder: 'Subheader text' },
  blockquote: { tag: 'blockquote', className: '', placeholder: 'Quote text...' },
  math: { tag: 'div', className: '', placeholder: 'Enter LaTeX: x^2 + y^2 = r^2' }
};

class ArticleBuilder {
  constructor() {
    this.content = document.getElementById('markdown-output');
    this.componentCounter = 0;
    this._selectedComponent = null;
    this.debugMode = false;
    this.debugElement = null;
    this.currentArticleId = null;
    this.autoSaveDelay = 500;
    this.autoSaveTimer = null;
    this.savingIndicator = document.getElementById('saving-indicator');
    this.savingText = this.savingIndicator?.querySelector('.saving-text');
    this.hasUnsavedChanges = false;
    this.liveMarkdown = ''; // Live markdown content
    this.init();
  }

  get selectedComponent() {
    return this._selectedComponent;
  }

  set selectedComponent(value) {
    this._selectedComponent = value;
    this.updateSelectedComponentStyle();
    this.updateManagementButtonStates();
    this.updateDebugInfo();
    this.updateComponentButtonsPosition();
  }

  init() {
    this.syncComponentCounter();
    this.updateManagementButtonStates();
    this.setupComponentToolbarListeners();
    this.setupComponentSelection();
    this.setupPasteHandling();
    this.setupDebugMode();
    this.setupTextSelectionToolbar();
    this.setupAutoSave();
  }

  syncComponentCounter() {
    // Find the highest component number in existing components
    const components = this.content.querySelectorAll('.builder-component[id^="component-"]');
    let maxCounter = 0;

    components.forEach(comp => {
      const match = comp.id.match(/component-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxCounter) maxCounter = num;
      }
    });

    this.componentCounter = maxCounter;
  }

  setupAutoSave() {
    // Listen for content changes
    const observeChanges = () => {
      this.rebuildLiveMarkdown();
      this.scheduleAutoSave();
    };

    // Watch for content changes in the editor
    const observer = new MutationObserver(observeChanges);
    observer.observe(this.content, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });

    // Watch for changes to title, date, and chapter
    const titleElement = document.querySelector('h1');
    const dateElement = document.querySelector('.article-date');
    const chapterElement = document.querySelector('.article-chapter');

    // Add title length limit
    if (titleElement) {
      const maxLength = 80;

      titleElement.addEventListener('input', (e) => {
        if (e.target.textContent.length > maxLength) {
          e.target.textContent = e.target.textContent.substring(0, maxLength);
          // Place cursor at end
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(e.target);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        observeChanges();
      });


      titleElement.addEventListener('blur', observeChanges);
    }

    [dateElement, chapterElement].forEach(element => {
      if (element) {
        element.addEventListener('input', observeChanges);
        element.addEventListener('blur', observeChanges);
      }
    });
  }

  scheduleAutoSave() {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Show unsaved changes immediately
    this.updateSavingIndicator('unsaved');

    // Schedule new auto-save
    this.autoSaveTimer = setTimeout(() => {
      this.performAutoSave();
    }, this.autoSaveDelay);
  }

  performAutoSave() {
    this.updateSavingIndicator('saving');

    try {
      if (!this.currentArticleId) {
        // Create new article if none exists
        this.createNewArticle();
      } else {
        // Update existing article
        this.updateCurrentArticle();
      }
      this.updateSavingIndicator('saved');
    } catch (error) {
      // Silent error handling - show error state but don't log to console
      this.updateSavingIndicator('error');
    }
  }

  createNewArticle() {
    const articleData = LocalStorageManager.getCurrentArticleData();
    this.currentArticleId = LocalStorageManager.saveArticle(articleData);
    renderSavedArticles(); // Refresh homepage
  }

  updateCurrentArticle() {
    if (!this.currentArticleId) return;

    const articleData = LocalStorageManager.getCurrentArticleData();
    articleData.id = this.currentArticleId;
    LocalStorageManager.saveArticle(articleData);
    renderSavedArticles(); // Refresh homepage
  }

  setCurrentArticleId(id) {
    this.currentArticleId = id;
    // Persist the current article ID to localStorage
    if (id) {
      localStorage.setItem('current_article_id', id);
    }
  }

  clearCurrentArticle() {
    this.currentArticleId = null;
    localStorage.removeItem('current_article_id');
    this.updateSavingIndicator('saved');
  }

  updateSavingIndicator(state) {
    if (!this.savingIndicator || !this.savingText) return;

    this.savingIndicator.className = `saving-indicator ${state}`;

    switch (state) {
      case 'saving':
        this.savingText.textContent = 'Saving...';
        break;
      case 'saved':
        this.savingText.textContent = 'Saved';
        this.hasUnsavedChanges = false;
        break;
      case 'unsaved':
        this.savingText.textContent = 'Unsaved changes';
        this.hasUnsavedChanges = true;
        break;
      case 'error':
        this.savingText.textContent = 'Save failed';
        break;
    }
  }

  setupComponentToolbarListeners() {
    document.querySelectorAll('.component-btn[data-component]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const component = e.currentTarget.dataset.component;
        this.addComponent(component);
      });
    });

    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        if (this.selectedComponent) {
          const element = document.getElementById(this.selectedComponent);
          if (element) {
            element.remove();
            this.selectedComponent = null;
          }
        }
      });
    }

    const moveUpBtn = document.getElementById('move-up-btn');
    if (moveUpBtn) {
      moveUpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedComponent) {
          const element = document.getElementById(this.selectedComponent);
          const prevComponent = this.getPreviousComponent(element);
          if (element && prevComponent) {
            this.content.insertBefore(element, prevComponent);
            this.updateComponentButtonsPosition();
          }
        }
      });
    }

    const moveDownBtn = document.getElementById('move-down-btn');
    if (moveDownBtn) {
      moveDownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedComponent) {
          const element = document.getElementById(this.selectedComponent);
          const nextComponent = this.getNextComponent(element);
          if (element && nextComponent) {
            this.content.insertBefore(nextComponent, element);
            this.updateComponentButtonsPosition();
          }
        }
      });
    }
  }

  setupPasteHandling() {
    document.addEventListener('paste', (e) => {
      if (e.target.isContentEditable) {
        e.preventDefault();
        e.stopPropagation();
        const text = e.clipboardData?.getData('text/plain') || '';
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(text));
        selection.collapseToEnd();
      }
    }, true);
  }

  addComponent(type) {
    const id = `component-${++this.componentCounter}`;
    let element;

    switch (type) {
      case 'paragraph':
      case 'header':
      case 'subheader':
      case 'blockquote':
        element = this.createSimpleComponent(type);
        break;
      case 'unordered-list':
        element = this.createList('ul');
        break;
      case 'ordered-list':
        element = this.createList('ol');
        break;
      case 'code':
        element = this.createCode();
        break;
      case 'image':
        element = this.createImage();
        break;
      case 'table':
        element = this.createTable();
        break;
      case 'math':
        element = this.createMath();
        break;
    }

    if (element) {
      element.id = id;
      element.classList.add('builder-component');

      // Insert after selected component, or at the end if nothing selected
      if (this.selectedComponent) {
        const selectedElement = document.getElementById(this.selectedComponent);
        if (selectedElement) {
          const nextComponent = this.getNextComponent(selectedElement);
          if (nextComponent) {
            this.content.insertBefore(element, nextComponent);
          } else {
            this.content.appendChild(element);
          }
        } else {
          this.content.appendChild(element);
        }
      } else {
        this.content.appendChild(element);
      }

      // Use requestAnimationFrame to ensure DOM is ready before selecting
      requestAnimationFrame(() => {
        // Select the newly created component
        this.selectedComponent = id;

        // Focus the new component if it's contentEditable
        if (element.contentEditable === 'true') {
          element.focus();
        } else {
          // For complex components, find the first contentEditable element
          const firstEditable = element.querySelector('[contenteditable="true"]');
          if (firstEditable) {
            firstEditable.focus();
          }
        }
      });
    }
  }

  createSimpleComponent(type) {
    const config = ARTICLE_COMPONENT_TYPES[type];
    if (!config) return null;

    const element = document.createElement(config.tag);
    element.className = config.className;
    element.contentEditable = true;
    element.setAttribute('data-placeholder', config.placeholder);

    // Handle Enter key to create new paragraph
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newParagraph = this.createSimpleComponent('paragraph');
        if (newParagraph) {
          const id = `component-${++this.componentCounter}`;
          newParagraph.id = id;
          newParagraph.classList.add('builder-component');

          const wrapper = element.closest('.builder-component');
          const nextComponent = this.getNextComponent(wrapper);
          if (nextComponent) {
            this.content.insertBefore(newParagraph, nextComponent);
          } else {
            this.content.appendChild(newParagraph);
          }

          this.selectedComponent = id;
          newParagraph.focus();
        }
      }
    });

    return element;
  }

  createMath() {
    const div = document.createElement('div');
    div.contentEditable = true;
    div.setAttribute('data-placeholder', 'Enter LaTeX: x^2 + y^2 = r^2');
    div.setAttribute('type', 'math');
    return div;
  }

  createCode() {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('type', 'code');

    const languageInput = document.createElement('div');
    languageInput.className = 'code-language';
    languageInput.contentEditable = true;
    languageInput.setAttribute('data-placeholder', 'Language (e.g., javascript)');
    languageInput.textContent = 'javascript';

    // Prevent line breaks in language input
    languageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.contentEditable = true;
    code.setAttribute('data-placeholder', 'Enter code here...');
    pre.appendChild(code);

    wrapper.appendChild(languageInput);
    wrapper.appendChild(pre);
    return wrapper;
  }

  createList(listType = 'ul') {
    const list = document.createElement(listType);
    const li = document.createElement('li');
    li.contentEditable = true;
    li.setAttribute('data-placeholder', 'List item...');

    list.addEventListener('keydown', (e) => {
      // When you click on Enter:
      // - If you are in an empty li, then delete the current li and insert new paragraph component.
      // - If you are in a non empty li, then insert new li.
      if (e.key === 'Enter' && e.target.tagName === 'LI') {
        e.preventDefault();
        if (e.target.textContent.trim() === '') {
          e.target.remove();
          const paragraphElement = this.createSimpleComponent('paragraph');
          if (paragraphElement) {
            const id = `component-${++this.componentCounter}`;
            paragraphElement.id = id;
            paragraphElement.classList.add('builder-component');
            list.parentNode.insertBefore(paragraphElement, list.nextSibling);
            paragraphElement.focus();
          }
        } else {
          const newLi = document.createElement('li');
          newLi.contentEditable = true;
          newLi.setAttribute('data-placeholder', 'List item...');
          e.target.parentNode.insertBefore(newLi, e.target.nextSibling);
          newLi.focus();
        }
      }
      // When you click on Backspace. If you are in an empty li and it's not the only li, then delete the current li.
      else if (e.key === 'Backspace' && e.target.tagName === 'LI') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.startOffset === 0 && e.target.textContent.trim() === '') {
            e.preventDefault();
            // If it's the only item, don't delete
            const listItems = e.target.parentNode.children;
            if (listItems.length === 1) {
              return;
            }
            // Remove empty li and focus previous one if exists
            const prevLi = e.target.previousElementSibling;
            e.target.remove();
            if (prevLi) {
              prevLi.focus();
              // Place cursor at end
              const newRange = document.createRange();
              const newSelection = window.getSelection();
              newRange.selectNodeContents(prevLi);
              newRange.collapse(false);
              newSelection.removeAllRanges();
              newSelection.addRange(newRange);
            }
          }
        }
      }
    });

    list.appendChild(li);
    return list;
  }

  createImage() {
    const figure = document.createElement('figure');

    const button = document.createElement('button');
    button.textContent = 'Insert Image';
    button.style.cssText = 'width: 100%; height: 40px; border: 1px solid #ccc; background: #f9f9f9; color: #333; font-size: 14px; cursor: pointer;';

    const img = document.createElement('img');
    img.style.display = 'none';

    const caption = document.createElement('figcaption');
    caption.contentEditable = true;
    caption.setAttribute('data-placeholder', 'Image caption...');
    caption.style.display = 'none';

    button.addEventListener('click', () => {
      const url = prompt('Enter image URL:') || '';
      if (url && url.trim()) {
        img.src = url.trim();
        img.style.cssText = 'display: block; width: 100%;';
        caption.style.display = 'block';
        button.style.display = 'none';
      }
    });

    figure.appendChild(button);
    figure.appendChild(img);
    figure.appendChild(caption);
    return figure;
  }

  createTable() {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';

    const table = document.createElement('table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let i = 0; i < 3; i++) {
      const th = document.createElement('th');
      th.contentEditable = true;
      th.setAttribute('data-placeholder', `Header ${i + 1}`);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < 2; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < 3; j++) {
        const td = document.createElement('td');
        td.contentEditable = true;
        td.setAttribute('data-placeholder', `Cell ${i + 1},${j + 1}`);
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
  }

  setupComponentSelection() {
    document.addEventListener('click', (e) => {
      const component = e.target.closest('.builder-component');
      if (component) {
        this.selectedComponent = component.id;
      } else {
        this.selectedComponent = null;
      }
    });
  }

  updateSelectedComponentStyle() {
    const currentSelected = document.querySelector('.builder-component.selected');

    // If selection changed, remove selected class from current and handle math/code rendering
    if (currentSelected && currentSelected.id !== this.selectedComponent) {
      currentSelected.classList.remove('selected');

      // Render math when unselecting
      if (currentSelected.getAttribute('type') === 'math') {
        const mathText = currentSelected.textContent.trim();
        currentSelected.dataset.mathText = mathText;

        // If empty, keep it editable to show placeholder
        if (!mathText) {
          currentSelected.contentEditable = true;
          currentSelected.textContent = '';
        } else {
          currentSelected.innerHTML = `$$${mathText}$$`;
          currentSelected.contentEditable = false;

          // Render with MathJax
          if (window.MathJax && window.MathJax.typesetPromise) {
            // Clear any previous MathJax rendering
            if (window.MathJax.typesetClear) {
              MathJax.typesetClear([currentSelected]);
            }
            MathJax.typesetPromise([currentSelected]).catch((err) => {
              console.error('MathJax rendering failed:', err);
            });
          }
        }
      }

      // Render code with syntax highlighting when unselecting
      if (currentSelected.getAttribute('type') === 'code') {
        const codeEl = currentSelected.querySelector('code');
        const languageEl = currentSelected.querySelector('.code-language');
        if (codeEl && languageEl) {
          const code = codeEl.textContent;
          const language = languageEl.textContent.trim() || 'javascript';

          // Store original code
          codeEl.dataset.code = code;

          // Apply Prism highlighting
          codeEl.className = `language-${language}`;
          codeEl.textContent = code;
          if (window.Prism) {
            Prism.highlightElement(codeEl);
          }
          codeEl.contentEditable = false;
        }
      }
    }

    // Add selected class to new selected component and handle math/code input mode
    if (this.selectedComponent) {
      const selectedElement = document.getElementById(this.selectedComponent);
      if (selectedElement) {
        const wasSelected = selectedElement.classList.contains('selected');
        selectedElement.classList.add('selected');

        // Switch to input mode when selecting math (always, even if already selected)
        if (selectedElement.getAttribute('type') === 'math') {
          // If it's not editable, it's in rendered mode - switch to edit mode
          if (selectedElement.contentEditable !== 'true') {
            selectedElement.contentEditable = true;
            selectedElement.innerHTML = '';
            selectedElement.textContent = selectedElement.dataset.mathText || '';
            selectedElement.focus();
          }
        }

        // Switch to edit mode when selecting code (always, even if already selected)
        if (selectedElement.getAttribute('type') === 'code') {
          const codeEl = selectedElement.querySelector('code');
          if (codeEl && codeEl.contentEditable !== 'true') {
            const originalCode = codeEl.dataset.code || codeEl.textContent;
            codeEl.innerHTML = '';
            codeEl.textContent = originalCode;
            codeEl.className = '';
            codeEl.contentEditable = true;
          }
        }
      }
    }
  }

  updateManagementButtonStates() {
    const deleteBtn = document.getElementById('delete-btn');
    const moveUpBtn = document.getElementById('move-up-btn');
    const moveDownBtn = document.getElementById('move-down-btn');

    if (this.selectedComponent) {
      deleteBtn?.classList.add('active');
      moveUpBtn?.classList.add('active');
      moveDownBtn?.classList.add('active');
    } else {
      deleteBtn?.classList.remove('active');
      moveUpBtn?.classList.remove('active');
      moveDownBtn?.classList.remove('active');
    }
  }

  setupDebugMode() {
    this.debugElement = document.createElement('div');
    this.debugElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      display: none;
    `;
    document.body.appendChild(this.debugElement);

    // Toggle debug mode with Ctrl+D
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        this.toggleDebugMode();
      }
    });
  }

  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    this.debugElement.style.display = this.debugMode ? 'block' : 'none';
    if (this.debugMode) {
      this.updateDebugInfo();
    }
  }

  updateDebugInfo() {
    if (this.debugMode && this.debugElement) {
      this.debugElement.innerHTML = `
        <strong>Debug Info</strong><br>
        Component Counter: ${this.componentCounter}<br>
        Selected Component: ${this.selectedComponent || 'none'}<br>
        Total Components: ${this.content.querySelectorAll('.builder-component').length}<br>
        Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}<br>
        <small>Press Ctrl+D to toggle</small>
      `;
    }
  }

  updateComponentButtonsPosition() {
    const componentButtons = document.querySelector('.component-buttons:not(.control-buttons)');
    if (!componentButtons) return;

    if (this.selectedComponent) {
      const selectedElement = document.getElementById(this.selectedComponent);
      if (selectedElement) {
        // Insert after the selected component
        selectedElement.insertAdjacentElement('afterend', componentButtons);
      }
    } else {
      // Move to the end of the content area
      this.content.appendChild(componentButtons);
    }
  }

  getPreviousComponent(element) {
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.classList.contains('builder-component')) {
        return sibling;
      }
      sibling = sibling.previousElementSibling;
    }
    return null;
  }

  getNextComponent(element) {
    let sibling = element.nextElementSibling;
    while (sibling) {
      if (sibling.classList.contains('builder-component')) {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  rebuildLiveMarkdown() {
    // Rebuild markdown from all components in real-time
    const components = this.content.querySelectorAll('.builder-component');
    const markdownParts = [];

    components.forEach((component) => {
      const md = convertComponentToMarkdown(component);
      if (md) markdownParts.push(md);
    });

    this.liveMarkdown = markdownParts.join('\n\n');
  }

  viewLiveMarkdown() {
    // Show the live markdown in a modal/alert
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 90%;
      max-width: 1200px;
      height: 85vh;
      display: flex;
      flex-direction: column;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Live Markdown';
    title.style.marginTop = '0';

    const textarea = document.createElement('textarea');
    textarea.value = this.liveMarkdown;
    textarea.readOnly = true;
    textarea.style.cssText = `
      flex: 1;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      padding: 10px;
      border: 1px solid #ccc;
      resize: none;
    `;

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    copyBtn.onclick = () => {
      textarea.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    closeBtn.onclick = () => modal.remove();

    buttons.append(copyBtn, closeBtn);
    content.append(title, textarea, buttons);
    modal.appendChild(content);
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
  }

  setupTextSelectionToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'selection-toolbar';
    this.toolbar.innerHTML = '<button data-command="bold">B</button><button data-command="italic">I</button><button data-command="strikethrough">S</button><button data-command="link">L</button>';
    document.body.appendChild(this.toolbar);

    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();

      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

        if (this.content.contains(element)) {
          // Check if the selection is in a formattable element
          const formattableElement = element.closest('p, blockquote, ul li, ol li, td, th');

          if (formattableElement) {
            const rect = range.getBoundingClientRect();
            this.toolbar.style.left = `${rect.left + (rect.width / 2) - 25}px`;
            this.toolbar.style.top = `${rect.top - 45}px`;
            this.toolbar.style.display = 'block';
          } else {
            this.toolbar.style.display = 'none';
          }
        } else {
          this.toolbar.style.display = 'none';
        }
      } else {
        this.toolbar.style.display = 'none';
      }
    });

    this.toolbar.addEventListener('click', (e) => {
      const command = e.target.dataset.command;
      if (command === 'link') {
        this.createLink();
      } else if (command) {
        document.execCommand(command, false, null);
      }
    });
  }

  createLink() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const url = prompt('Enter URL:') || '';
      if (url && url.trim()) {
        const range = selection.getRangeAt(0);
        const selectedText = range.extractContents();
        const link = document.createElement('a');
        link.href = url.trim();
        link.appendChild(selectedText);
        range.insertNode(link);
      }
    }
  }
}

// ===== LOCAL STORAGE UTILITIES =====
const LocalStorageManager = {
  STORAGE_KEY: 'saved_articles',

  saveArticle(articleData) {
    const articles = this.getAllArticles();
    const articleId = articleData.id || this.generateId();

    const article = {
      id: articleId,
      title: articleData.title,
      date: articleData.date,
      tag: articleData.tag,
      content: articleData.content,
      timestamp: Date.now()
    };

    articles[articleId] = article;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(articles));
    return articleId;
  },

  getAllArticles() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  },

  getArticle(id) {
    const articles = this.getAllArticles();
    return articles[id] || null;
  },

  deleteArticle(id) {
    const articles = this.getAllArticles();
    delete articles[id];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(articles));
  },

  generateId() {
    return 'article_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  },

  getCurrentArticleData() {
    const titleElement = document.querySelector('h1');
    const dateElement = document.querySelector('.article-date');
    const chapterElement = document.querySelector('.article-chapter');

    const title = titleElement?.textContent?.trim() || 'Untitled Article';
    const date = dateElement?.textContent?.trim() || new Date().toLocaleDateString();
    const tag = chapterElement?.textContent?.trim() || 'General';

    // Use live markdown from builder instance
    const content = window.articleBuilderInstance?.liveMarkdown || generateMarkdownFromBuilder();

    return { title, date, tag, content };
  }
};

// Global navigation functions for builder homepage
function showBuilderHomepage() {
  // Save current article before navigating away
  if (window.articleBuilderInstance && window.articleBuilderInstance.hasUnsavedChanges) {
    window.articleBuilderInstance.performAutoSave();
  }

  // Navigate to builder.html
  window.location.href = '/builder.html';
}

function showArticleEditor() {
  // Navigate to builder-article.html
  window.location.href = '/builder-article.html';
}

function exportArticle() {
  const outputContainer = document.getElementById('markdown-output');
  const titleElement = document.querySelector('h1');
  const chapterElement = document.querySelector('.article-chapter');
  const dateElement = document.querySelector('.article-date');

  let markdown = '';

  // Add YAML front matter if title exists
  const title = titleElement?.textContent?.trim();
  const chapter = chapterElement?.textContent?.trim();
  const date = dateElement?.textContent?.trim();

  if (title && title !== 'Untitled Article') {
    markdown += '---\n';
    markdown += `title: ${title}\n`;
    if (date && date !== 'Dec 25, 2024') {
      markdown += `date: ${date}\n`;
    }
    if (chapter && chapter !== 'Chapter') {
      markdown += `chapter: ${chapter}\n`;
    }
    markdown += '---\n\n';
  }

  // Convert each component to markdown
  const components = outputContainer.querySelectorAll('.builder-component');

  components.forEach((component, index) => {
    const componentMarkdown = convertComponentToMarkdown(component);
    if (componentMarkdown) {
      markdown += componentMarkdown;
      // Add spacing between components except for the last one
      if (index < components.length - 1) {
        markdown += '\n\n';
      }
    }
  });

  // Create and download the file
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title ? `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()}.md` : 'article.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadArticle(articleId) {
  const article = LocalStorageManager.getArticle(articleId);
  if (!article) {
    console.warn('Article not found with ID:', articleId);
    return;
  }

  // Clear current content
  document.getElementById('markdown-output').innerHTML = '';

  // Set title, date, and tag
  const titleElement = document.querySelector('h1');
  const dateElement = document.querySelector('.article-date');
  const chapterElement = document.querySelector('.article-chapter');

  if (titleElement) titleElement.textContent = article.title;
  if (dateElement) dateElement.textContent = article.date;
  if (chapterElement) chapterElement.textContent = article.tag;

  // Load content
  if (article.content) {
    importMarkdownToBuilder(article.content);
  }

  // Set the current article ID for auto-save
  if (window.articleBuilderInstance) {
    window.articleBuilderInstance.setCurrentArticleId(articleId);
    window.articleBuilderInstance.updateSavingIndicator('saved');
    window.articleBuilderInstance.syncComponentCounter();
    window.articleBuilderInstance.rebuildLiveMarkdown();
  }

  // Article loaded successfully
}

function createNewArticle() {
  // Clear the editor for a new article
  document.getElementById('markdown-output').innerHTML = '';

  // Reset title, date, and tag to defaults
  const titleElement = document.querySelector('h1');
  const dateElement = document.querySelector('.article-date');
  const chapterElement = document.querySelector('.article-chapter');

  if (titleElement) titleElement.textContent = 'Untitled Article';
  if (dateElement) dateElement.textContent = new Date().toLocaleDateString();
  if (chapterElement) chapterElement.textContent = 'Chapter';

  // Clear the current article ID so auto-save creates a new one
  if (window.articleBuilderInstance) {
    window.articleBuilderInstance.clearCurrentArticle();
    window.articleBuilderInstance.componentCounter = 0;
    window.articleBuilderInstance.liveMarkdown = '';
    window.articleBuilderInstance.updateSavingIndicator('saved');
  }

  // New article created successfully
}

function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

function renderSavedArticles() {
  const articles = LocalStorageManager.getAllArticles();
  const articlesContainer = document.getElementById('articles-list');

  if (!articlesContainer) return;

  // Clear existing content
  articlesContainer.innerHTML = '';

  const articleIds = Object.keys(articles).sort((a, b) => articles[b].timestamp - articles[a].timestamp);

  if (articleIds.length === 0) {
    articlesContainer.innerHTML = '<div class="no-articles">No saved articles yet. Create your first article!</div>';
    return;
  }

  articleIds.forEach(id => {
    const article = articles[id];
    const articleCard = document.createElement('div');
    articleCard.className = 'article-card';
    articleCard.style.cursor = 'pointer';
    articleCard.onclick = () => loadSavedArticle(id);

    // Format relative time
    const timeAgo = getRelativeTime(article.timestamp);

    articleCard.innerHTML = `
      <div class="article-row">
        <div class="article-info">
          <h3>${article.title}</h3>
          <span class="article-tag">${article.tag}</span>
        </div>
        <div class="article-actions">
          <span class="article-date">Updated ${timeAgo}</span>
          <div class="article-card-actions">
            <button class="delete-btn" onclick="event.stopPropagation(); deleteSavedArticle('${id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
    articlesContainer.appendChild(articleCard);
  });
}

function loadSavedArticle(articleId) {
  // Store the article ID to load
  localStorage.setItem('article_to_load', articleId);
  // Navigate to editor page
  window.location.href = '/builder-article.html';
}

function deleteSavedArticle(articleId) {
  const article = LocalStorageManager.getArticle(articleId);
  if (article && confirm(`Are you sure you want to delete "${article.title}"?`)) {
    LocalStorageManager.deleteArticle(articleId);
    renderSavedArticles();
  }
}

function clearAll() {
  if (confirm('Are you sure you want to clear all content?')) {
    document.getElementById('markdown-output').innerHTML = '';
    // Article content cleared
  }
}

function viewMarkdown() {
  if (window.articleBuilderInstance) {
    window.articleBuilderInstance.rebuildLiveMarkdown();
    window.articleBuilderInstance.viewLiveMarkdown();
  }
}

function convertComponentToMarkdown(component) {
  const className = component.className;
  const content = component.textContent.trim();

  if (!content) return '';

  // Handle different component types
  if (component.tagName === 'H2') {
    return `# ${convertHtmlToMarkdown(component.innerHTML)}`;
  } else if (component.tagName === 'H3') {
    return `## ${convertHtmlToMarkdown(component.innerHTML)}`;
  } else if (component.tagName === 'BLOCKQUOTE') {
    const lines = convertHtmlToMarkdown(component.innerHTML).split('\n');
    return lines.map(line => `> ${line}`).join('\n');
  } else if (component.tagName === 'UL' || component.tagName === 'OL') {
    return convertListToMarkdown(component);
  } else if (className.includes('table-wrapper')) {
    const table = component.querySelector('table');
    return convertTableToMarkdown(table);
  } else if (component.getAttribute('type') === 'code') {
    const languageEl = component.querySelector('.code-language');
    const codeEl = component.querySelector('code');
    const language = languageEl?.textContent.trim() || '';
    const code = codeEl?.textContent.trim() || '';
    // Skip empty code blocks
    if (!code) return '';
    return `\`\`\`${language}\n${code}\n\`\`\``;
  } else if (component.getAttribute('type') === 'math') {
    // For math components, check if currently editing or rendered
    let mathText;
    if (component.contentEditable === 'true') {
      // Currently editing - get text content directly
      mathText = component.textContent.trim();
    } else {
      // Rendered - get from dataset or extract from display
      mathText = component.dataset.mathText || extractMathFromDisplay(component);
    }
    // Skip empty math blocks
    if (!mathText) return '';
    return `$$\n${mathText}\n$$`;
  } else if (component.tagName === 'FIGURE') {
    // Handle image components
    const img = component.querySelector('img');
    const caption = component.querySelector('figcaption');

    if (img && img.src && img.style.display !== 'none') {
      const alt = caption?.textContent?.trim() || '';
      return `![${alt}](${img.src})`;
    }
    return ''; // No image set yet
  } else if (component.tagName === 'P') {
    return convertHtmlToMarkdown(component.innerHTML);
  }

  // Default to paragraph if unknown type
  return convertHtmlToMarkdown(component.innerHTML);
}

function convertHtmlToMarkdown(html) {
  return html
    // Bold
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    // Italic
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    // Strikethrough (handle both <s> and <strike>)
    .replace(/<s>(.*?)<\/s>/g, '~~$1~~')
    .replace(/<strike>(.*?)<\/strike>/g, '~~$1~~')
    // Links
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
    // Remove any other HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function convertListToMarkdown(list) {
  if (!list) return '';

  const isOrdered = list.tagName === 'OL';
  const items = list.querySelectorAll('li');

  return Array.from(items).map((item, index) => {
    const content = convertHtmlToMarkdown(item.innerHTML);
    if (isOrdered) {
      return `${index + 1}. ${content}`;
    } else {
      return `- ${content}`;
    }
  }).join('\n');
}

function convertTableToMarkdown(table) {
  if (!table) return '';

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  let markdown = '';

  // Header row
  if (thead) {
    const headerCells = thead.querySelectorAll('th');
    const headerRow = Array.from(headerCells).map(cell =>
      convertHtmlToMarkdown(cell.innerHTML)
    ).join(' | ');
    markdown += `| ${headerRow} |\n`;

    // Separator row
    const separatorRow = Array.from(headerCells).map(() => '---').join(' | ');
    markdown += `| ${separatorRow} |\n`;
  }

  // Data rows
  if (tbody) {
    const rows = tbody.querySelectorAll('tr');
    Array.from(rows).forEach(row => {
      const cells = row.querySelectorAll('td');
      const rowContent = Array.from(cells).map(cell =>
        convertHtmlToMarkdown(cell.innerHTML)
      ).join(' | ');
      markdown += `| ${rowContent} |\n`;
    });
  }

  return markdown.trim();
}

function extractMathFromDisplay(mathElement) {
  // Try to extract LaTeX from various possible formats
  const text = mathElement.textContent || mathElement.innerHTML;

  // If it's already wrapped in $$, extract content
  const dollarMatch = text.match(/\$\$(.*?)\$\$/s);
  if (dollarMatch) {
    return dollarMatch[1].trim();
  }

  // Return as-is if no $$ wrapper found
  return text.trim();
}


function generateMarkdownFromBuilder() {
  // This is the same logic as exportArticle but returns the markdown instead of downloading
  const outputContainer = document.getElementById('markdown-output');
  const titleElement = document.querySelector('h1');
  const chapterElement = document.querySelector('.article-chapter');
  const dateElement = document.querySelector('.article-date');

  let markdown = '';

  // Add YAML front matter if title exists
  const title = titleElement?.textContent?.trim();
  const chapter = chapterElement?.textContent?.trim();
  const date = dateElement?.textContent?.trim();

  if (title && title !== 'Untitled Article') {
    markdown += '---\n';
    markdown += `title: ${title}\n`;
    if (date && date !== 'Dec 25, 2024') {
      markdown += `date: ${date}\n`;
    }
    if (chapter && chapter !== 'Chapter') {
      markdown += `chapter: ${chapter}\n`;
    }
    markdown += '---\n\n';
  }

  // Convert each component to markdown
  const components = outputContainer.querySelectorAll('.builder-component');

  components.forEach((component, index) => {
    const componentMarkdown = convertComponentToMarkdown(component);
    if (componentMarkdown) {
      markdown += componentMarkdown;
      // Add spacing between components except for the last one
      if (index < components.length - 1) {
        markdown += '\n\n';
      }
    }
  });

  return markdown;
}

function importMarkdownToBuilder(markdown) {
  const outputContainer = document.getElementById('markdown-output');
  outputContainer.innerHTML = '';

  // Extract metadata if present (YAML front matter)
  let content = markdown;
  let metadata = {};

  if (markdown.startsWith('---')) {
    const yamlEnd = markdown.indexOf('---', 3);
    if (yamlEnd !== -1) {
      const yamlContent = markdown.substring(3, yamlEnd).trim();
      content = markdown.substring(yamlEnd + 3).trim();

      // Simple YAML parser for title and date
      yamlContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim().replace(/['"]/g, '');
          metadata[key.trim()] = value;
        }
      });
    }
  }

  // Note: Title and date are not imported - user can add them manually later

  // First, handle math blocks that might span multiple paragraphs
  // Use a more robust regex to handle multiline math blocks
  content = content.replace(/\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g, (_, mathContent) => {
    return `MATHBLOCK:${mathContent.trim()}:MATHBLOCK`;
  });

  // Split content into blocks, but also handle MATHBLOCK markers specially
  let rawBlocks = content.split(/\n\s*\n/).filter(block => block.trim());

  // Process blocks to separate math blocks that might be mixed with text
  const blocks = [];
  rawBlocks.forEach(block => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;

    // Check if this block contains MATHBLOCK markers mixed with other content
    if (trimmedBlock.includes('MATHBLOCK:') && trimmedBlock.includes(':MATHBLOCK')) {
      // Split on MATHBLOCK markers to separate them
      const parts = trimmedBlock.split(/(MATHBLOCK:.*?:MATHBLOCK)/);
      parts.forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart) {
          blocks.push(trimmedPart);
        }
      });
    } else {
      blocks.push(trimmedBlock);
    }
  });

  let componentCounter = 0;

  blocks.forEach(block => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;

    let element = null;
    const id = `component-${++componentCounter}`;

    // Headers
    if (trimmedBlock.startsWith('## ')) {
      element = createBuilderComponent('subheader', trimmedBlock.substring(3));
    } else if (trimmedBlock.startsWith('# ')) {
      element = createBuilderComponent('header', trimmedBlock.substring(2));
    }
    // Blockquote
    else if (trimmedBlock.startsWith('> ')) {
      const quoteText = trimmedBlock.split('\n').map(line =>
        line.startsWith('> ') ? line.substring(2) : line
      ).join('\n');
      element = createBuilderComponent('blockquote', quoteText);
    }
    // Lists
    else if (/^\s*\d+\.\s+/.test(trimmedBlock)) {
      element = createBuilderList('ol', trimmedBlock);
    } else if (/^\s*[-*+]\s+/.test(trimmedBlock)) {
      element = createBuilderList('ul', trimmedBlock);
    }
    // Tables
    else if (trimmedBlock.includes('|') && trimmedBlock.includes('---')) {
      element = createBuilderTable(trimmedBlock);
    }
    // Code blocks
    else if (trimmedBlock.startsWith('```')) {
      element = createBuilderCodeBlock(trimmedBlock);
    }
    // Math blocks (preprocessed)
    else if (trimmedBlock.startsWith('MATHBLOCK:') && trimmedBlock.endsWith(':MATHBLOCK')) {
      const mathContent = trimmedBlock.slice(10, -10);
      element = createBuilderComponent('math', mathContent);
    }
    // Images
    else if (trimmedBlock.startsWith('![')) {
      element = createBuilderImage(trimmedBlock);
    }
    // Regular paragraph
    else {
      element = createBuilderComponent('paragraph', trimmedBlock);
    }

    if (element) {
      element.id = id;
      element.classList.add('builder-component');
      outputContainer.appendChild(element);
    }
  });

  // Rebuild live markdown after import and sync counter
  if (window.articleBuilderInstance) {
    window.articleBuilderInstance.syncComponentCounter();
    window.articleBuilderInstance.rebuildLiveMarkdown();
  }
}

function createBuilderComponent(type, content) {
  const config = ARTICLE_COMPONENT_TYPES[type];
  if (!config) return null;

  const element = document.createElement(config.tag);
  element.className = config.className;
  element.contentEditable = true;
  element.setAttribute('data-placeholder', config.placeholder);

  // Set type attribute for special components
  if (type === 'math') {
    element.setAttribute('type', 'math');
  }

  // Handle Enter key to create new paragraph (for paragraph, header, subheader, blockquote)
  if (type === 'paragraph' || type === 'header' || type === 'subheader' || type === 'blockquote') {
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const builder = window.articleBuilderInstance;
        if (builder) {
          const newParagraph = builder.createSimpleComponent('paragraph');
          if (newParagraph) {
            const id = `component-${++builder.componentCounter}`;
            newParagraph.id = id;
            newParagraph.classList.add('builder-component');

            const wrapper = element.closest('.builder-component');
            const nextComponent = builder.getNextComponent(wrapper);
            if (nextComponent) {
              builder.content.insertBefore(newParagraph, nextComponent);
            } else {
              builder.content.appendChild(newParagraph);
            }

            builder.selectedComponent = id;
            newParagraph.focus();
          }
        }
      }
    });
  }

  if (content) {
    if (type === 'math') {
      // For math components, store the raw LaTeX and render it
      element.dataset.mathText = content;
      element.innerHTML = `$$${content}$$`;
      element.contentEditable = false;

      // Trigger MathJax rendering when MathJax is ready
      const renderMath = () => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          // Clear any existing MathJax rendering first
          if (window.MathJax.typesetClear) {
            MathJax.typesetClear([element]);
          }
          MathJax.typesetPromise([element]).catch((err) => {
            console.error('MathJax rendering failed:', err);
          });
        } else {
          // MathJax not ready yet, try again
          setTimeout(renderMath, 100);
        }
      };
      setTimeout(renderMath, 50);
    } else {
      // Convert markdown formatting to HTML for other components
      const htmlContent = convertMarkdownToHtml(content);
      element.innerHTML = htmlContent;
    }
  }

  return element;
}

function convertMarkdownToHtml(text) {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    // Italic
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<s>$1</s>');
}

function createBuilderList(listType, content) {
  const list = document.createElement(listType);
  const lines = content.split('\n').filter(line => line.trim());

  lines.forEach(line => {
    const match = listType === 'ol' ?
      line.match(/^\s*\d+\.\s+(.*)$/) :
      line.match(/^\s*[-*+]\s+(.*)$/);

    if (match) {
      const li = document.createElement('li');
      li.contentEditable = true;
      li.innerHTML = convertMarkdownToHtml(match[1]);
      li.setAttribute('data-placeholder', 'List item...');
      list.appendChild(li);
    }
  });

  return list;
}

function createBuilderTable(content) {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';

  const table = document.createElement('table');
  const lines = content.split('\n').filter(line => line.trim());

  // Parse headers
  const headerCells = lines[0].split('|').slice(1, -1).map(cell => cell.trim());
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  headerCells.forEach(headerText => {
    const th = document.createElement('th');
    th.contentEditable = true;
    th.innerHTML = convertMarkdownToHtml(headerText);
    th.setAttribute('data-placeholder', 'Header');
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Parse data rows (skip separator line)
  const tbody = document.createElement('tbody');
  lines.slice(2).forEach(line => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    const row = document.createElement('tr');

    cells.forEach(cellText => {
      const td = document.createElement('td');
      td.contentEditable = true;
      td.innerHTML = convertMarkdownToHtml(cellText);
      td.setAttribute('data-placeholder', 'Cell');
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function createBuilderImage(markdown) {
  // Parse markdown image: ![alt text](url)
  const match = markdown.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) return null;

  const alt = match[1];
  const url = match[2];

  const figure = document.createElement('figure');

  const button = document.createElement('button');
  button.textContent = 'Insert Image';
  button.style.cssText = 'width: 100%; height: 40px; border: 1px solid #ccc; background: #f9f9f9; color: #333; font-size: 14px; cursor: pointer; display: none;';

  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'display: block; width: 100%;';

  const caption = document.createElement('figcaption');
  caption.contentEditable = true;
  caption.setAttribute('data-placeholder', 'Image caption...');
  caption.textContent = alt;
  caption.style.display = 'block';

  button.addEventListener('click', () => {
    const newUrl = prompt('Enter image URL:', url) || '';
    if (newUrl && newUrl.trim()) {
      img.src = newUrl.trim();
      img.style.cssText = 'display: block; width: 100%;';
      caption.style.display = 'block';
      button.style.display = 'none';
    }
  });

  figure.appendChild(button);
  figure.appendChild(img);
  figure.appendChild(caption);
  return figure;
}

function createBuilderCodeBlock(content) {
  const lines = content.split('\n');
  const firstLine = lines[0];
  const language = firstLine.replace(/^```/, '').trim() || 'javascript';
  const code = lines.slice(1, -1).join('\n');

  // Skip empty code blocks
  if (!code || code.trim() === '') {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.setAttribute('type', 'code');

  const languageInput = document.createElement('div');
  languageInput.className = 'code-language';
  languageInput.contentEditable = true;
  languageInput.setAttribute('data-placeholder', 'Language');
  languageInput.textContent = language;

  // Prevent line breaks in language input
  languageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });

  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.setAttribute('data-placeholder', 'Enter code here...');

  // Store original code and apply syntax highlighting
  codeEl.dataset.code = code;
  codeEl.className = `language-${language}`;
  codeEl.textContent = code;
  codeEl.contentEditable = false;

  // Apply Prism highlighting after element is created
  if (window.Prism) {
    setTimeout(() => Prism.highlightElement(codeEl), 0);
  }

  pre.appendChild(codeEl);
  wrapper.appendChild(languageInput);
  wrapper.appendChild(pre);
  return wrapper;
}

function setEditMode(isEditMode) {
  const articleEditor = document.getElementById('article-editor');
  const outputContainer = document.getElementById('markdown-output');
  const componentButtons = document.querySelector('.component-buttons');

  if (isEditMode) {
    // Enable edit mode
    articleEditor.classList.remove('preview-mode');
    outputContainer.classList.remove('preview-mode');
    if (componentButtons) componentButtons.style.display = 'flex';

    // Make all elements contentEditable
    outputContainer.querySelectorAll('[contenteditable]').forEach(el => {
      el.contentEditable = true;
    });
    outputContainer.querySelectorAll('.builder-component').forEach(el => {
      el.contentEditable = true;
    });
  } else {
    // Enable preview mode
    articleEditor.classList.add('preview-mode');
    outputContainer.classList.add('preview-mode');
    if (componentButtons) componentButtons.style.display = 'none';

    // Disable contentEditable
    outputContainer.querySelectorAll('[contenteditable]').forEach(el => {
      el.contentEditable = false;
    });
    outputContainer.querySelectorAll('.builder-component').forEach(el => {
      el.contentEditable = false;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the editor page
  const articleEditor = document.getElementById('article-editor');
  if (articleEditor) {
    window.articleBuilderInstance = new ArticleBuilder();

    // Check if there's an article to load
    const articleToLoad = localStorage.getItem('article_to_load');
    if (articleToLoad) {
      loadArticle(articleToLoad);
      localStorage.removeItem('article_to_load');
    } else {
      // Check if there's markdown to import
      const markdownToImport = localStorage.getItem('markdown_to_import');
      if (markdownToImport) {
        importMarkdownToBuilder(markdownToImport);
        localStorage.removeItem('markdown_to_import');
      } else {
        // Try to restore the last article being edited
        const lastArticleId = localStorage.getItem('current_article_id');
        if (lastArticleId) {
          loadArticle(lastArticleId);
        } else {
          // Create new article if nothing to load
          createNewArticle();
        }
      }
    }
  }

  // Load saved articles on homepage
  renderSavedArticles();

  // Setup homepage button listeners
  const newArticleBtn = document.getElementById('new-article-btn');
  if (newArticleBtn) {
    newArticleBtn.addEventListener('click', () => {
      // Clear any stored article to load
      localStorage.removeItem('article_to_load');
      localStorage.removeItem('current_article_id');
      // Navigate to editor page
      window.location.href = '/builder-article.html';
    });
  }

  const importMdInput = document.getElementById('import-md-input');
  if (importMdInput) {
    importMdInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.includes('text')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const markdown = event.target.result;
          // Store markdown to import
          localStorage.setItem('markdown_to_import', markdown);
          localStorage.removeItem('article_to_load');
          localStorage.removeItem('current_article_id');
          // Navigate to editor page
          window.location.href = '/builder-article.html';
        };
        reader.readAsText(file);
      }
    });
  }

  // Setup mode toggle listeners
  const editModeBtn = document.getElementById('edit-mode-btn');
  const previewModeBtn = document.getElementById('preview-mode-btn');

  if (editModeBtn && previewModeBtn) {
    editModeBtn.addEventListener('click', () => {
      editModeBtn.classList.add('active');
      previewModeBtn.classList.remove('active');
      setEditMode(true);
    });

    previewModeBtn.addEventListener('click', () => {
      previewModeBtn.classList.add('active');
      editModeBtn.classList.remove('active');
      setEditMode(false);
    });
  }

});