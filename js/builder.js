// ===== COMPONENT TYPES =====
const COMPONENT_TYPES = {
  paragraph: { tag: 'div', className: 'article-paragraph', placeholder: 'Start writing...' },
  header: { tag: 'div', className: 'article-header', placeholder: 'Header text' },
  subheader: { tag: 'div', className: 'article-subheader', placeholder: 'Subheader text' },
  subsubheader: { tag: 'div', className: 'article-subsubheader', placeholder: 'Subsubheader text' },
  blockquote: { tag: 'div', className: 'article-blockquote', placeholder: 'Quote text...' }
};

// ===== MAIN BUILDER CLASS =====
class ArticleBuilder {
  constructor() {
    this.content = document.getElementById('markdown-output');
    this.componentCounter = 0;
    this.formattingToolbar = null;
    this.init();
  }

  init() {
    this.setupPasteHandling();
    this.setupFormatting();
    this.createComponentButtons();
    this.createFormattingToolbar();
  }

  setupPasteHandling() {
    document.addEventListener('paste', (e) => {
      if (e.target.isContentEditable) {
        e.preventDefault();
        e.stopPropagation();

        // Get plain text from clipboard
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    });
  }


  setupFormatting() {
    document.addEventListener('keydown', (e) => {
      if (e.target.isContentEditable) {
        // Handle Enter key in list items
        if (e.key === 'Enter' && e.target.tagName === 'LI') {
          e.preventDefault();
          this.handleListEnter(e.target);
          return;
        }

        // Handle formatting shortcuts
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'b') {
            e.preventDefault();
            this.toggleFormat('bold');
          } else if (e.key === 'i') {
            e.preventDefault();
            this.toggleFormat('italic');
          } else if (e.key === 'k') {
            e.preventDefault();
            this.toggleFormat('link');
          } else if (e.key === 's') {
            e.preventDefault();
            this.toggleFormat('strikethrough');
          }
        }
      }
    });

    // Handle text selection for toolbar
    document.addEventListener('selectionchange', () => {
      this.handleSelectionChange();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.formatting-toolbar') && !e.target.closest('[contenteditable="true"]')) {
        this.hideFormattingToolbar();
      }
    });
  }

  toggleFormat(format) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0 || selection.isCollapsed) return;

    if (format === 'bold') {
      document.execCommand('bold', false, null);
    } else if (format === 'italic') {
      document.execCommand('italic', false, null);
    } else if (format === 'strikethrough') {
      document.execCommand('strikeThrough', false, null);
    } else if (format === 'link') {
      const url = prompt('Enter URL:', 'https://');
      if (url && url.trim() !== '' && url !== 'https://') {
        document.execCommand('createLink', false, url.trim());
      }
    }
  }

  createComponentButtons() {
    if (this.content.querySelector('.component-buttons')) {
      return;
    }

    const buttons = document.createElement('div');
    buttons.className = 'component-buttons';
    buttons.innerHTML = `
      <button class="component-btn" data-component="paragraph" title="Add Paragraph">¶</button>
      <button class="component-btn" data-component="header" title="Add Header">H1</button>
      <button class="component-btn" data-component="subheader" title="Add Subheader">H2</button>
      <button class="component-btn" data-component="subsubheader" title="Add Subsubheader">H3</button>
      <button class="component-btn" data-component="blockquote" title="Add Quote">"</button>
      <button class="component-btn" data-component="unordered-list" title="Add Unordered List">•</button>
      <button class="component-btn" data-component="ordered-list" title="Add Ordered List">1.</button>
      <button class="component-btn" data-component="image" title="Add Image">📷</button>
      <button class="component-btn" data-component="table" title="Add Table">⊞</button>
      <button class="component-btn" data-component="divider" title="Add Divider">—</button>
    `;

    buttons.querySelectorAll('.component-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const component = e.currentTarget.dataset.component;
        this.addComponent(component);
      });
    });

    this.content.appendChild(buttons);
  }

  addComponent(type) {
    const id = `component-${++this.componentCounter}`;
    let element;

    switch (type) {
      case 'paragraph':
      case 'header':
      case 'subheader':
      case 'subsubheader':
      case 'blockquote':
        element = this.createSimpleComponent(type);
        break;
      case 'unordered-list':
        element = this.createList('ul');
        break;
      case 'ordered-list':
        element = this.createList('ol');
        break;
      case 'image':
        element = this.createImage();
        break;
      case 'table':
        element = this.createTable();
        break;
      case 'divider':
        element = this.createDivider();
        break;
    }

    if (element) {
      element.id = id;
      element.classList.add('builder-component');

      const buttons = this.content.querySelector('.component-buttons');
      this.content.insertBefore(element, buttons);

      const editable = element.querySelector('[contenteditable="true"]') ||
        (element.contentEditable === 'true' ? element : null);
      if (editable) {
        editable.focus();
      }
    }
  }

  createSimpleComponent(type) {
    const config = COMPONENT_TYPES[type];
    if (!config) return null;
    
    const element = document.createElement(config.tag);
    element.className = config.className;
    element.contentEditable = true;
    element.setAttribute('data-placeholder', config.placeholder);
    return element;
  }

  createDivider() {
    const div = document.createElement('div');
    div.className = 'article-divider';
    return div;
  }

  createList(listType = 'ul') {
    const wrapper = document.createElement('div');
    wrapper.className = 'article-list';

    const list = document.createElement(listType);
    const li = document.createElement('li');
    li.contentEditable = true;
    li.setAttribute('data-placeholder', 'List item...');

    list.appendChild(li);
    wrapper.appendChild(list);
    return wrapper;
  }

  createImage() {
    const wrapper = document.createElement('div');
    wrapper.className = 'article-image';

    const img = document.createElement('img');
    img.src = 'https://via.placeholder.com/600x300?text=Click+to+change+image';
    img.alt = 'Placeholder image';
    img.addEventListener('click', () => {
      const url = prompt('Enter image URL:', img.src);
      if (url) img.src = url;
    });

    const caption = document.createElement('p');
    caption.contentEditable = true;
    caption.setAttribute('data-placeholder', 'Image caption...');

    wrapper.appendChild(img);
    wrapper.appendChild(caption);
    return wrapper;
  }


  createTable() {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'article-table';

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
    
    tableContainer.appendChild(table);
    
    return tableContainer;
  }

  createFormattingToolbar() {
    this.formattingToolbar = document.createElement('div');
    this.formattingToolbar.className = 'formatting-toolbar';
    this.formattingToolbar.innerHTML = `
      <button class="format-btn" data-format="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
      <button class="format-btn" data-format="italic" title="Italic (Ctrl+I)"><em>I</em></button>
      <button class="format-btn" data-format="strikethrough" title="Strikethrough (Ctrl+S)"><s>S</s></button>
      <button class="format-btn" data-format="link" title="Link (Ctrl+K)">🔗</button>
    `;

    this.formattingToolbar.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const format = e.currentTarget.dataset.format;
        this.toggleFormat(format);

        setTimeout(() => {
          this.showFormattingToolbar();
        }, 10);
      });
    });

    document.body.appendChild(this.formattingToolbar);
  }

  handleSelectionChange() {
    const selection = window.getSelection();

    if (document.activeElement && document.activeElement.closest('.formatting-toolbar')) {
      return;
    }

    if (selection.rangeCount === 0 || selection.isCollapsed) {
      setTimeout(() => {
        if (!document.activeElement || !document.activeElement.closest('.formatting-toolbar')) {
          this.hideFormattingToolbar();
        }
      }, 10);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container;

    const editableParent = element.closest('[contenteditable="true"]');
    if (!editableParent) {
      this.hideFormattingToolbar();
      return;
    }

    this.showFormattingToolbar();
  }

  showFormattingToolbar() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      this.hideFormattingToolbar();
      return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    this.formattingToolbar.style.top = (rect.top + scrollTop - 40) + 'px';
    this.formattingToolbar.style.left = (rect.left + scrollLeft + (rect.width / 2) - 50) + 'px';

    this.formattingToolbar.classList.add('show');
  }

  hideFormattingToolbar() {
    if (this.formattingToolbar) {
      this.formattingToolbar.classList.remove('show');
    }
  }

  handleListEnter(currentLi) {
    const list = currentLi.parentElement;
    const listWrapper = list.parentElement;

    // If current item is empty, remove it and exit list
    if (currentLi.textContent.trim() === '') {
      // If this is the only item, don't remove it
      if (list.children.length === 1) {
        return;
      }
      
      currentLi.remove();
      
      // If list is now empty, remove the whole list wrapper
      if (list.children.length === 0) {
        listWrapper.remove();
      }
      
      return;
    }

    // Create new list item
    const newLi = document.createElement('li');
    newLi.contentEditable = true;
    newLi.setAttribute('data-placeholder', 'List item...');

    // Insert new item after current one
    if (currentLi.nextSibling) {
      list.insertBefore(newLi, currentLi.nextSibling);
    } else {
      list.appendChild(newLi);
    }

    // Focus the new item
    newLi.focus();
  }

}

// ===== MARKDOWN CONVERTER =====
const MarkdownConverter = {
  convertToMarkdown(element) {
    let markdown = '';
    
    for (const child of element.children) {
      if (child.classList.contains('component-buttons')) continue;
      
      markdown += this.convertElement(child) + '\n\n';
    }
    
    return markdown.trim();
  },
  
  convertElement(element) {
    const className = element.className;
    const text = this.getCleanText(element);
    
    if (className.includes('article-header')) {
      return `# ${text}`;
    } else if (className.includes('article-subheader')) {
      return `## ${text}`;
    } else if (className.includes('article-subsubheader')) {
      return `### ${text}`;
    } else if (className.includes('article-paragraph')) {
      return this.convertInlineFormatting(element);
    } else if (className.includes('article-blockquote')) {
      return `> ${text}`;
    } else if (className.includes('article-list')) {
      return this.convertList(element);
    } else if (className.includes('article-image')) {
      return this.convertImage(element);
    } else if (className.includes('article-table') || className.includes('table-container')) {
      return this.convertTable(element);
    } else if (className.includes('article-divider')) {
      return '---';
    }
    
    return text;
  },
  
  getCleanText(element) {
    return element.textContent.trim().replace(/\s+/g, ' ');
  },
  
  convertInlineFormatting(element) {
    let result = '';
    
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        const text = node.textContent;
        
        if (tagName === 'strong' || tagName === 'b') {
          result += `**${text}**`;
        } else if (tagName === 'em' || tagName === 'i') {
          result += `*${text}*`;
        } else if (tagName === 's' || tagName === 'strike') {
          result += `~~${text}~~`;
        } else if (tagName === 'a') {
          const href = node.getAttribute('href') || '#';
          result += `[${text}](${href})`;
        } else {
          result += text;
        }
      }
    }
    
    return result;
  },
  
  convertList(element) {
    const list = element.querySelector('ul, ol');
    if (!list) return '';
    
    const isOrdered = list.tagName === 'OL';
    const items = Array.from(list.querySelectorAll('li'));
    
    return items.map((item, index) => {
      const text = this.getCleanText(item);
      const prefix = isOrdered ? `${index + 1}. ` : '- ';
      return prefix + text;
    }).join('\n');
  },
  
  convertImage(element) {
    const img = element.querySelector('img');
    const caption = element.querySelector('p');
    
    if (!img) return '';
    
    const alt = img.getAttribute('alt') || 'Image';
    const src = img.getAttribute('src') || '';
    const captionText = caption ? this.getCleanText(caption) : '';
    
    let markdown = `![${alt}](${src})`;
    if (captionText) {
      markdown += `\n\n*${captionText}*`;
    }
    
    return markdown;
  },
  
  convertTable(element) {
    // Handle both direct table and table-container structure
    const table = element.classList.contains('article-table') ? 
      element : element.querySelector('.article-table');
    
    if (!table) return '';
    
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!thead || !tbody) return '';
    
    let markdown = '';
    
    const headerCells = Array.from(thead.querySelectorAll('th'));
    const headerRow = '| ' + headerCells.map(cell => this.getCleanText(cell)).join(' | ') + ' |';
    const separator = '| ' + headerCells.map(() => '---').join(' | ') + ' |';
    
    markdown += headerRow + '\n' + separator + '\n';
    
    const bodyRows = Array.from(tbody.querySelectorAll('tr'));
    bodyRows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const rowMarkdown = '| ' + cells.map(cell => this.getCleanText(cell)).join(' | ') + ' |';
      markdown += rowMarkdown + '\n';
    });
    
    return markdown.trim();
  }
};

// ===== BUILDER ACTIONS =====
const BuilderActions = {
  goBack() {
    if (confirm('Are you sure you want to go back? Unsaved changes will be lost.')) {
      window.history.back();
    }
  },

  exportArticle() {
    const content = document.getElementById('markdown-output');
    const markdownContent = MarkdownConverter.convertToMarkdown(content);

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'article.md';
    a.click();
    URL.revokeObjectURL(url);
  },

  clearAll() {
    if (confirm('Are you sure you want to clear all content?')) {
      const content = document.getElementById('markdown-output');
      content.innerHTML = '';

      document.querySelector('.article-title').textContent = 'Article Title';
      document.querySelector('.article-date').textContent = 'Dec 25, 2024';
      document.querySelector('.article-chapter').textContent = 'Chapter';

      new ArticleBuilder();
    }
  }
};

// ===== GLOBAL FUNCTIONS =====
function goBack() {
  BuilderActions.goBack();
}

function exportArticle() {
  BuilderActions.exportArticle();
}

function clearAll() {
  BuilderActions.clearAll();
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  new ArticleBuilder();
});

