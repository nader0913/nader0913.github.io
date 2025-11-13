function toHTML(md) {
  md = md.replace(/\\\$/g, 'ESCAPED_DOLLAR_SIGN');

  const codeBlocks = [];
  const languages = [];
  md = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `CODE_BLOCK_${codeBlocks.length}`;
    codeBlocks.push({ lang: lang || '', code: code.trim() });
    if (lang) {
      languages.push(lang);
    }
    return placeholder;
  });

  const blocks = md.split(/\n{2,}/).map(block => parseBlock(block.trim()));

  let html = blocks.join('\n\n')
    .replace(/^### (.*$)/gim, '<div type="subheader"><h3>$1</h3></div>')
    .replace(/^## (.*$)/gim, '<div type="subheader"><h3>$1</h3></div>')
    .replace(/^# (.*$)/gim, '<div type="header"><h2>$1</h2></div>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<div type="image"><figure><img alt="$1" src="$2"><figcaption>$1</figcaption></figure></div>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
    .replace(/^>\s?(.*)$/gim, '<div type="blockquote"><blockquote>$1</blockquote></div>');

  codeBlocks.forEach((block, i) => {
    html = html.replace(`CODE_BLOCK_${i}`, renderCodeBlock(block.lang, block.code));
  });

  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => `<div type="math">$$${expr}$$</div>`);
  html = html.replace(/\$(.+?)\$/g, (_, expr) => `\\(${expr}\\)`);
  html = html.replace(/ESCAPED_DOLLAR_SIGN/g, '$');

  return { html, languages };
}

function toMarkdown(html) {
  let md = html;

  md = md.replace(/<div type="code">(?:<div class="code-language">(\w+)<\/div>)?<pre(?:\s+class="language-\w+")?><code(?:\s+class="language-\w+")?>(.+?)<\/code><\/pre><\/div>/gs, (_, lang, code) => {
    const unescapedCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    return lang ? `\`\`\`${lang}\n${unescapedCode}\n\`\`\`` : `\`\`\`\n${unescapedCode}\n\`\`\``;
  });

  md = md.replace(/<div type="math">\$\$([\s\S]+?)\$\$<\/div>/g, '$$$$1$$');
  md = md.replace(/\\\((.+?)\\\)/g, '\$$1\$');

  md = md.replace(/<div type="image"><figure><img alt="(.*?)" src="(.*?)"><figcaption>.*?<\/figcaption><\/figure><\/div>/g, '![$1]($2)');
  md = md.replace(/<a href="(.*?)" target="_blank">(.*?)<\/a>/g, '[$2]($1)');

  md = md.replace(/<div type="header"><h2>(.*?)<\/h2><\/div>/g, '# $1');
  md = md.replace(/<div type="subheader"><h3>(.*?)<\/h3><\/div>/g, '## $1');

  md = md.replace(/<b>(.*?)<\/b>/g, '**$1**');
  md = md.replace(/<i>(.*?)<\/i>/g, '*$1*');

  md = md.replace(/<div type="blockquote"><blockquote>(.*?)<\/blockquote><\/div>/g, '> $1');

  md = md.replace(/<div type="list"><ol>([\s\S]*?)<\/ol><\/div>/g, (_, items) => {
    let counter = 1;
    return items.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. ${RegExp.$1}`).trim();
  });

  md = md.replace(/<div type="list"><ul>([\s\S]*?)<\/ul><\/div>/g, (_, items) => {
    return items.replace(/<li>(.*?)<\/li>/g, '- $1').trim();
  });

  md = md.replace(/<div type="table"><div class="table-wrapper"><table><thead><tr>(.*?)<\/tr><\/thead><tbody>(.*?)<\/tbody><\/table><\/div><\/div>/gs, (_, headers, body) => {
    const headerCells = headers.match(/<th>(.*?)<\/th>/g).map(h => h.replace(/<\/?th>/g, ''));
    const headerRow = '| ' + headerCells.join(' | ') + ' |';
    const separator = '| ' + headerCells.map(() => '---').join(' | ') + ' |';

    const rows = body.match(/<tr>(.*?)<\/tr>/gs).map(row => {
      const cells = row.match(/<td>(.*?)<\/td>/g).map(c => c.replace(/<\/?td>/g, ''));
      return '| ' + cells.join(' | ') + ' |';
    });

    return [headerRow, separator, ...rows].join('\n');
  });

  md = md.replace(/<div type="paragraph"><p>(.*?)<\/p><\/div>/g, '$1');

  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

function parseBlock(block) {
  if (/^CODE_BLOCK_\d+$/.test(block)) {
    return block;
  }

  if (/^\|.+\n\|[-:| ]+\n?/.test(block)) {
    return parseTable(block);
  }

  if (/^\s*\d+\.\s+/.test(block)) {
    return parseOrderedList(block);
  }

  if (/^\s*-\s+/.test(block)) {
    return parseUnorderedList(block);
  }

  const isSpecialBlock = block.startsWith('> ') || block.startsWith('#') ||
    block.startsWith('<div') || block.startsWith('<blockquote') ||
    block.startsWith('<img') || block.startsWith('$$') ||
    block.includes('![');

  return isSpecialBlock ? block : `<div type="paragraph"><p>${block}</p></div>`;
}

function parseOrderedList(block) {
  const items = block.split('\n')
    .map(line => {
      const match = line.match(/^\s*\d+\.\s+(.*)$/);
      return match ? `<li>${match[1]}</li>` : '';
    })
    .join('');
  return `<div type="list"><ol>${items}</ol></div>`;
}

function parseUnorderedList(block) {
  const items = block.split('\n')
    .map(line => {
      const match = line.match(/^\s*-\s+(.*)$/);
      return match ? `<li>${match[1]}</li>` : '';
    })
    .join('');
  return `<div type="list"><ul>${items}</ul></div>`;
}

function parseTable(tableMd) {
  const lines = tableMd.trim().split('\n');
  const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
  const rows = lines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

  let html = '<div type="table"><div class="table-wrapper"><table><thead><tr>';
  headers.forEach(h => html += `<th>${h}</th>`);
  html += '</tr></thead><tbody>';
  rows.forEach(cells => {
    html += '<tr>';
    cells.forEach(c => html += `<td>${c}</td>`);
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';

  return html;
}

function renderCodeBlock(lang, code) {
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const langClass = lang ? ` class="language-${lang}"` : '';
  const langLabel = lang ? `<div class="code-language">${lang}</div>` : '';

  return `<div type="code">${langLabel}<pre${langClass}><code${langClass}>${escapedCode}</code></pre></div>`;
}

function MarkdownToHtml(markdown) {
  // Split markdown into blocks (paragraphs separated by blank lines)
  const blocks = markdown.split(/\n\n+/);

  let html = '';

  blocks.forEach(block => {
    block = block.trim();
    if (!block) return;

    // Headers
    if (block.startsWith('# ')) {
      const content = block.substring(2);
      html += `<div type="header"><h2>${content}</h2></div>\n`;
    }
    else if (block.startsWith('## ')) {
      const content = block.substring(3);
      html += `<div type="subheader"><h3>${content}</h3></div>\n`;
    }
    // Blockquote
    else if (block.startsWith('> ')) {
      const lines = block.split('\n').map(line =>
        line.startsWith('> ') ? line.substring(2) : line
      ).join('\n');
      html += `<div type="blockquote"><blockquote>${lines}</blockquote></div>\n`;
    }
    // Ordered list
    else if (/^\d+\.\s/.test(block)) {
      const items = block.split('\n')
        .map(line => {
          const match = line.match(/^\d+\.\s+(.*)$/);
          return match ? `<li>${match[1]}</li>` : '';
        })
        .join('');
      html += `<div type="list"><ol>${items}</ol></div>\n`;
    }
    // Unordered list
    else if (/^[-*]\s/.test(block)) {
      const items = block.split('\n')
        .map(line => {
          const match = line.match(/^[-*]\s+(.*)$/);
          return match ? `<li>${match[1]}</li>` : '';
        })
        .join('');
      html += `<div type="list"><ul>${items}</ul></div>\n`;
    }
    // Table
    else if (block.includes('|') && block.includes('---')) {
      const lines = block.split('\n').filter(line => line.trim());
      const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
      const rows = lines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

      let tableHtml = '<table><thead><tr>';
      headers.forEach(h => tableHtml += `<th>${h}</th>`);
      tableHtml += '</tr></thead><tbody>';
      rows.forEach(cells => {
        tableHtml += '<tr>';
        cells.forEach(c => tableHtml += `<td>${c}</td>`);
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table>';

      html += `<div type="table"><div class="table-wrapper">${tableHtml}</div></div>\n`;
    }
    // Default: paragraph
    else {
      html += `<div type="paragraph"><p>${block}</p></div>\n`;
    }
  });

  return html.trim();
}