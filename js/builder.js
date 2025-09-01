const COMPONENT_TYPES = {
  paragraph: { tag: 'div', className: 'article-paragraph', placeholder: 'Start writing...' },
  header: { tag: 'div', className: 'article-header', placeholder: 'Header text' },
  subheader: { tag: 'div', className: 'article-subheader', placeholder: 'Subheader text' },
  subsubheader: { tag: 'div', className: 'article-subsubheader', placeholder: 'Subsubheader text' },
  blockquote: { tag: 'div', className: 'article-blockquote', placeholder: 'Quote text...' }
};

class ArticleBuilder {
  constructor() {
    this.content = document.getElementById('markdown-output');
    this.componentCounter = 0;
    this._selectedComponent = null;
    this.debugMode = false;
    this.debugElement = null;
    this.init();
  }

  get selectedComponent() {
    return this._selectedComponent;
  }

  set selectedComponent(value) {
    this._selectedComponent = value;
    this.updateSelectedComponentStyle();
    this.updateComponentManagementButtons();
    this.updateDebugInfo();
  }

  init() {
    this.updateComponentManagementButtons();
    this.setupComponentButtonListeners();
    this.setupComponentSelection();
    this.setupPasteHandling();
    this.setupDebugMode();
    this.setupTextSelectionToolbar();
  }

  setupComponentButtonListeners() {
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
          if (element && element.previousElementSibling) {
            this.content.insertBefore(element, element.previousElementSibling);
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
          if (element && element.nextElementSibling) {
            this.content.insertBefore(element.nextElementSibling, element);
          }
        }
      });
    }
  }

  setupPasteHandling() {
    document.addEventListener('paste', (e) => {
      if (e.target.isContentEditable) {
        e.preventDefault();
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
      case 'math':
        element = this.createMath();
        break;
    }

    if (element) {
      element.id = id;
      element.classList.add('builder-component');

      this.content.appendChild(element);
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

  createMath() {
    const div = document.createElement('div');
    div.className = 'article-math';
    div.contentEditable = true;
    div.setAttribute('data-placeholder', 'Enter LaTeX: x^2 + y^2 = r^2');
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

    const button = document.createElement('button');
    button.textContent = 'Insert Image';
    button.style.cssText = 'width: 100%; height: 40px; border: 1px solid #ccc; background: #f9f9f9; color: #333; font-size: 14px; cursor: pointer;';

    const img = document.createElement('img');
    img.style.display = 'none';

    const caption = document.createElement('p');
    caption.contentEditable = true;
    caption.setAttribute('data-placeholder', 'Image caption...');
    caption.style.display = 'none';

    button.addEventListener('click', () => {
      const url = prompt('Enter image URL:', '');
      if (url && url.trim()) {
        img.src = url.trim();
        img.style.display = 'block';
        caption.style.display = 'block';
        button.style.display = 'none';
      }
    });

    wrapper.appendChild(button);
    wrapper.appendChild(img);
    wrapper.appendChild(caption);
    return wrapper;
  }

  createTable() {
    const wrapper = document.createElement('div');
    wrapper.className = 'article-table';

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

    // If selection changed, remove selected class from current and handle math rendering
    if (currentSelected && currentSelected.id !== this.selectedComponent) {
      currentSelected.classList.remove('selected');

      // Render math when unselecting
      if (currentSelected.classList.contains('article-math')) {
        const mathText = currentSelected.textContent.trim();
        currentSelected.dataset.mathText = mathText;
        currentSelected.innerHTML = `$$${mathText}$$`;
        if (window.MathJax) {
          MathJax.typesetPromise([currentSelected]);
        }
      }
    }

    // Add selected class to new selected component and handle math input mode
    if (this.selectedComponent) {
      const selectedElement = document.getElementById(this.selectedComponent);
      if (selectedElement && !selectedElement.classList.contains('selected')) {
        selectedElement.classList.add('selected');

        // Switch to input mode when selecting math
        if (selectedElement.classList.contains('article-math')) {
          selectedElement.innerHTML = '';
          selectedElement.textContent = selectedElement.dataset.mathText;
        }
      }
    }
  }

  updateComponentManagementButtons() {
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
          const formattableElement = element.closest('.article-paragraph, .article-blockquote, .article-list li, .article-table td, .article-table th');
          
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
      const url = prompt('Enter URL:', 'https://');
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

document.addEventListener('DOMContentLoaded', () => {
  new ArticleBuilder();
});