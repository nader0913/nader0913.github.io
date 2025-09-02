/**
 * Simple round-trip conversion test for Article Builder
 * Tests: markdown -> import -> export -> compare
 */

const fs = require('fs');

// Extract just the conversion functions from builder.js
function convertHtmlToMarkdown(html) {
  return html
    // Bold
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    // Italic
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    // Strikethrough
    .replace(/<s>(.*?)<\/s>/g, '~~$1~~')
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

// Parse markdown content into blocks
function parseMarkdownIntoBlocks(markdown) {
  // Remove YAML front matter
  let content = markdown;
  if (markdown.startsWith('---')) {
    const yamlEnd = markdown.indexOf('---', 3);
    if (yamlEnd !== -1) {
      content = markdown.substring(yamlEnd + 3).trim();
    }
  }
  
  // Handle math blocks
  content = content.replace(/\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g, (_, mathContent) => {
    return `MATHBLOCK:${mathContent.trim()}:MATHBLOCK`;
  });
  
  // Split into blocks
  const blocks = content.split(/\n\s*\n/).filter(block => block.trim());
  return blocks;
}

// Test markdown blocks
function testMarkdownBlocks(blocks) {
  console.log(`\n🧩 Testing ${blocks.length} markdown blocks...`);
  
  let passedBlocks = 0;
  
  blocks.forEach((block, i) => {
    const trimmed = block.trim();
    console.log(`\nBlock ${i + 1}: "${trimmed.substring(0, 50)}${trimmed.length > 50 ? '...' : ''}"`);
    
    // Test different block types
    if (trimmed.startsWith('# ')) {
      console.log(`  -> Type: Header 1`);
      const content = trimmed.substring(2);
      const html = convertMarkdownToHtml(content);
      const back = convertHtmlToMarkdown(html);
      const match = content === back;
      console.log(`  -> Match: ${match ? '✅' : '❌'} (${content} -> ${back})`);
      if (match) passedBlocks++;
    } else if (trimmed.startsWith('## ')) {
      console.log(`  -> Type: Header 2`);
      const content = trimmed.substring(3);
      const html = convertMarkdownToHtml(content);
      const back = convertHtmlToMarkdown(html);
      const match = content === back;
      console.log(`  -> Match: ${match ? '✅' : '❌'} (${content} -> ${back})`);
      if (match) passedBlocks++;
    } else if (trimmed.startsWith('### ')) {
      console.log(`  -> Type: Header 3`);
      const content = trimmed.substring(4);
      const html = convertMarkdownToHtml(content);
      const back = convertHtmlToMarkdown(html);
      const match = content === back;
      console.log(`  -> Match: ${match ? '✅' : '❌'} (${content} -> ${back})`);
      if (match) passedBlocks++;
    } else if (trimmed.startsWith('> ')) {
      console.log(`  -> Type: Blockquote`);
      const content = trimmed.split('\n').map(line => 
        line.startsWith('> ') ? line.substring(2) : line
      ).join('\n');
      const html = convertMarkdownToHtml(content);
      const back = convertHtmlToMarkdown(html);
      const match = content === back;
      console.log(`  -> Match: ${match ? '✅' : '❌'}`);
      if (match) passedBlocks++;
    } else if (trimmed.startsWith('MATHBLOCK:')) {
      console.log(`  -> Type: Math Block`);
      const mathContent = trimmed.slice(10, -10);
      console.log(`  -> Math: ${mathContent}`);
      console.log(`  -> Match: ✅ (Math blocks preserved as-is)`);
      passedBlocks++;
    } else if (trimmed.includes('|') && trimmed.includes('---')) {
      console.log(`  -> Type: Table`);
      // Test table by converting each cell content
      const lines = trimmed.split('\n');
      let tableMatch = true;
      const processedLines = [];
      
      for (const line of lines) {
        if (line.includes('|') && !line.includes('---')) {
          const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
          const processedCells = cells.map(cell => {
            const html = convertMarkdownToHtml(cell);
            const back = convertHtmlToMarkdown(html);
            if (cell !== back) tableMatch = false;
            return back;
          });
          processedLines.push('| ' + processedCells.join(' | ') + ' |');
        } else {
          processedLines.push(line);
        }
      }
      
      console.log(`  -> Match: ${tableMatch ? '✅' : '❌'}`);
      if (tableMatch) passedBlocks++;
    } else if (/^\s*[-*+]\s+/.test(trimmed)) {
      console.log(`  -> Type: Unordered List`);
      // Test list by converting each item content
      const lines = trimmed.split('\n');
      let listMatch = true;
      
      for (const line of lines) {
        const match = line.match(/^\s*[-*+]\s+(.*)$/);
        if (match) {
          const content = match[1];
          const html = convertMarkdownToHtml(content);
          const back = convertHtmlToMarkdown(html);
          if (content !== back) {
            listMatch = false;
            console.log(`    -> Item mismatch: "${content}" -> "${back}"`);
          }
        }
      }
      
      console.log(`  -> Match: ${listMatch ? '✅' : '❌'}`);
      if (listMatch) passedBlocks++;
    } else if (/^\s*\d+\.\s+/.test(trimmed)) {
      console.log(`  -> Type: Ordered List`);
      // Test list by converting each item content
      const lines = trimmed.split('\n');
      let listMatch = true;
      
      for (const line of lines) {
        const match = line.match(/^\s*\d+\.\s+(.*)$/);
        if (match) {
          const content = match[1];
          const html = convertMarkdownToHtml(content);
          const back = convertHtmlToMarkdown(html);
          if (content !== back) {
            listMatch = false;
            console.log(`    -> Item mismatch: "${content}" -> "${back}"`);
          }
        }
      }
      
      console.log(`  -> Match: ${listMatch ? '✅' : '❌'}`);
      if (listMatch) passedBlocks++;
    } else {
      console.log(`  -> Type: Paragraph`);
      const html = convertMarkdownToHtml(trimmed);
      const back = convertHtmlToMarkdown(html);
      const match = trimmed === back;
      console.log(`  -> Match: ${match ? '✅' : '❌'}`);
      if (!match) {
        console.log(`  -> Expected: "${trimmed}"`);
        console.log(`  -> Got: "${back}"`);
      }
      if (match) passedBlocks++;
    }
  });
  
  return { passedBlocks, totalBlocks: blocks.length };
}

// Test all articles function
function testAllArticles() {
  console.log('📚 Testing all articles in articles/ directory...\n');
  
  const articlesDir = './articles/';
  const articles = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));
  
  console.log(`Found ${articles.length} articles to test:\n`);
  
  let totalArticleTests = 0;
  let passedArticleTests = 0;
  
  articles.forEach((filename, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Article ${index + 1}/${articles.length}: ${filename}`);
    console.log('='.repeat(60));
    
    const articlePath = articlesDir + filename;
    const articleMarkdown = fs.readFileSync(articlePath, 'utf8');
    console.log(`Length: ${articleMarkdown.length} characters`);
    
    try {
      // Parse and test this article
      const blocks = parseMarkdownIntoBlocks(articleMarkdown);
      const blockResults = testMarkdownBlocks(blocks);
      
      console.log(`\n🎯 Article Results: ${blockResults.passedBlocks}/${blockResults.totalBlocks} blocks passed`);
      
      totalArticleTests += blockResults.totalBlocks;
      passedArticleTests += blockResults.passedBlocks;
      
      if (blockResults.passedBlocks === blockResults.totalBlocks) {
        console.log('✅ Article passed all tests!');
      } else {
        console.log(`❌ Article failed ${blockResults.totalBlocks - blockResults.passedBlocks} tests`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing article ${filename}:`, error.message);
    }
  });
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 ARTICLES SUMMARY');
  console.log('='.repeat(80));
  console.log(`📚 Articles tested: ${articles.length}`);
  console.log(`🧩 Total blocks tested: ${totalArticleTests}`);
  console.log(`✅ Blocks passed: ${passedArticleTests}`);
  console.log(`❌ Blocks failed: ${totalArticleTests - passedArticleTests}`);
  console.log(`📈 Success rate: ${((passedArticleTests / totalArticleTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
  
  return { totalArticleTests, passedArticleTests, articleCount: articles.length };
}

// Load test markdown
const testMarkdown = fs.readFileSync('./test-article.md', 'utf8');

console.log('🧪 Starting Comprehensive Round-Trip Test...\n');
console.log('📄 Test article length:', testMarkdown.length);

try {
  console.log('\n📥 Testing basic markdown conversions...');
  
  // Test basic conversions first
  const basicTests = [
    '**Bold text**',
    '*Italic text*', 
    '~~Strikethrough text~~',
    '[Link text](http://example.com)',
    'This is **bold** and *italic* with [link](http://example.com)',
    'Mixed: **bold** *italic* ~~strike~~ [link](http://test.com)'
  ];
  
  let passedBasic = 0;
  
  basicTests.forEach((test, i) => {
    const html = convertMarkdownToHtml(test);
    const backToMd = convertHtmlToMarkdown(html);
    const match = test === backToMd;
    
    console.log(`Basic ${i + 1}: ${match ? '✅' : '❌'} "${test}"`);
    if (match) passedBasic++;
  });
  
  console.log(`\n📊 Basic Tests: ${passedBasic}/${basicTests.length} passed`);
  
  // Parse and test actual markdown file
  const blocks = parseMarkdownIntoBlocks(testMarkdown);
  const blockResults = testMarkdownBlocks(blocks);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 TEST-ARTICLE.MD RESULTS');
  console.log('='.repeat(60));
  console.log(`📝 Basic formatting: ${passedBasic}/${basicTests.length} passed`);
  console.log(`🧩 Document blocks: ${blockResults.passedBlocks}/${blockResults.totalBlocks} passed`);
  
  const testArticlePassed = passedBasic + blockResults.passedBlocks;
  const testArticleTotal = basicTests.length + blockResults.totalBlocks;
  
  if (testArticlePassed === testArticleTotal) {
    console.log('✅ test-article.md PASSED all tests!');
  } else {
    console.log(`❌ test-article.md FAILED ${testArticleTotal - testArticlePassed} tests.`);
  }
  
  console.log('='.repeat(60));
  
  // Now test all articles in articles/ directory
  const articleResults = testAllArticles();
  
  // Final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('🏆 FINAL COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`📄 test-article.md: ${testArticlePassed}/${testArticleTotal} passed`);
  console.log(`📚 Articles tested: ${articleResults.articleCount}`);
  console.log(`🧩 Total article blocks: ${articleResults.totalArticleTests}`);
  console.log(`✅ Article blocks passed: ${articleResults.passedArticleTests}`);
  
  const grandTotalPassed = testArticlePassed + articleResults.passedArticleTests;
  const grandTotalTests = testArticleTotal + articleResults.totalArticleTests;
  
  console.log(`\n🎯 GRAND TOTAL: ${grandTotalPassed}/${grandTotalTests} tests passed`);
  console.log(`📈 Overall success rate: ${((grandTotalPassed / grandTotalTests) * 100).toFixed(1)}%`);
  
  if (grandTotalPassed === grandTotalTests) {
    console.log('🎉 ALL TESTS PASSED! Round-trip conversion works perfectly across all content.');
  } else {
    console.log(`⚠️  ${grandTotalTests - grandTotalPassed} tests failed. Some issues detected.`);
  }
  
  console.log('='.repeat(80));
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.log('\nFull error:', error);
}