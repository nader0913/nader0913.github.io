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
    .replace(/^### (.*$)/gim, '<div class="article-subsubheader">$1</div>')
    .replace(/^## (.*$)/gim, '<div class="article-subheader">$1</div>')
    .replace(/^# (.*$)/gim, '<div class="article-header">$1</div>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<div class="article-image"><img alt="$1" src="$2"><p>$1</p></div>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
    .replace(/^>\s?(.*)$/gim, '<div class="article-blockquote">$1</div>');

  codeBlocks.forEach((block, i) => {
    html = html.replace(`CODE_BLOCK_${i}`, renderCodeBlock(block.lang, block.code));
  });

  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => `<div class="article-math">$$${expr}$$</div>`);
  html = html.replace(/\$(.+?)\$/g, (_, expr) => `\\(${expr}\\)`);
  html = html.replace(/ESCAPED_DOLLAR_SIGN/g, '$');

  return { html, languages };
}

function toMarkdown(html) {
  let md = html;

  md = md.replace(/<div class="article-code">(?:<div class="code-language">(\w+)<\/div>)?<pre(?:\s+class="language-\w+")?><code(?:\s+class="language-\w+")?>(.+?)<\/code><\/pre><\/div>/gs, (_, lang, code) => {
    const unescapedCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    return lang ? `\`\`\`${lang}\n${unescapedCode}\n\`\`\`` : `\`\`\`\n${unescapedCode}\n\`\`\``;
  });

  md = md.replace(/<div class="article-math">\$\$([\s\S]+?)\$\$<\/div>/g, '$$$$1$$');
  md = md.replace(/\\\((.+?)\\\)/g, '\$$1\$');

  md = md.replace(/<div class="article-image"><img alt="(.*?)" src="(.*?)"><p>.*?<\/p><\/div>/g, '![$1]($2)');
  md = md.replace(/<a href="(.*?)" target="_blank">(.*?)<\/a>/g, '[$2]($1)');

  md = md.replace(/<div class="article-header">(.*?)<\/div>/g, '# $1');
  md = md.replace(/<div class="article-subheader">(.*?)<\/div>/g, '## $1');
  md = md.replace(/<div class="article-subsubheader">(.*?)<\/div>/g, '### $1');

  md = md.replace(/<b>(.*?)<\/b>/g, '**$1**');
  md = md.replace(/<i>(.*?)<\/i>/g, '*$1*');

  md = md.replace(/<div class="article-blockquote">(.*?)<\/div>/g, '> $1');

  md = md.replace(/<div class="article-list"><ol>([\s\S]*?)<\/ol><\/div>/g, (_, items) => {
    let counter = 1;
    return items.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. ${RegExp.$1}`).trim();
  });

  md = md.replace(/<div class="article-list"><ul>([\s\S]*?)<\/ul><\/div>/g, (_, items) => {
    return items.replace(/<li>(.*?)<\/li>/g, '- $1').trim();
  });

  md = md.replace(/<div class="article-table"><table><thead><tr>(.*?)<\/tr><\/thead><tbody>(.*?)<\/tbody><\/table><\/div>/gs, (_, headers, body) => {
    const headerCells = headers.match(/<th>(.*?)<\/th>/g).map(h => h.replace(/<\/?th>/g, ''));
    const headerRow = '| ' + headerCells.join(' | ') + ' |';
    const separator = '| ' + headerCells.map(() => '---').join(' | ') + ' |';

    const rows = body.match(/<tr>(.*?)<\/tr>/gs).map(row => {
      const cells = row.match(/<td>(.*?)<\/td>/g).map(c => c.replace(/<\/?td>/g, ''));
      return '| ' + cells.join(' | ') + ' |';
    });

    return [headerRow, separator, ...rows].join('\n');
  });

  md = md.replace(/<div class="article-paragraph">(.*?)<\/div>/g, '$1');

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

  return isSpecialBlock ? block : `<div class="article-paragraph">${block}</div>`;
}

function parseOrderedList(block) {
  const items = block.split('\n')
    .map(line => {
      const match = line.match(/^\s*\d+\.\s+(.*)$/);
      return match ? `<li>${match[1]}</li>` : '';
    })
    .join('');
  return `<div class="article-list"><ol>${items}</ol></div>`;
}

function parseUnorderedList(block) {
  const items = block.split('\n')
    .map(line => {
      const match = line.match(/^\s*-\s+(.*)$/);
      return match ? `<li>${match[1]}</li>` : '';
    })
    .join('');
  return `<div class="article-list"><ul>${items}</ul></div>`;
}

function parseTable(tableMd) {
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

function renderCodeBlock(lang, code) {
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const langClass = lang ? ` class="language-${lang}"` : '';
  const langLabel = lang ? `<div class="code-language">${lang}</div>` : '';

  return `<div class="article-code">${langLabel}<pre${langClass}><code${langClass}>${escapedCode}</code></pre></div>`;
}
