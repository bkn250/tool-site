/* ============================================
   Markdown 在线编辑器
   自包含的 Markdown 解析器，无需外部依赖
   ============================================ */

(function() {
  const mdInput = document.getElementById('mdInput');
  const mdPreview = document.getElementById('mdPreview');
  const exportBtn = document.getElementById('exportHtmlBtn');
  const downloadBtn = document.getElementById('downloadMdBtn');
  const clearBtn = document.getElementById('clearMdBtn');
  const wordCount = document.getElementById('wordCount');
  const lineCount = document.getElementById('lineCount');

  // ========== Markdown 解析器 ==========
  function parseMarkdown(text) {
    // 按行处理
    const lines = text.split('\n');
    let html = '';
    let inCodeBlock = false;
    let inList = false;
    let listType = '';
    let inBlockquote = false;
    let tableBuffer = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 代码块
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          html += '</code></pre>\n';
          inCodeBlock = false;
        } else {
          const lang = line.trim().slice(3).trim();
          html += `<pre><code class="language-${lang || 'plaintext'}">`;
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        html += escapeHtml(line) + '\n';
        continue;
      }

      // 空行
      if (line.trim() === '') {
        if (inList) { html += '</li></ul>\n'; inList = false; }
        if (inBlockquote) { html += '</blockquote>\n'; inBlockquote = false; }
        if (tableBuffer.length > 0) {
          html += renderTable(tableBuffer);
          tableBuffer = [];
        }
        continue;
      }

      // 表格 (检测行是否包含 |)
      if (line.includes('|') && line.trim().startsWith('|')) {
        tableBuffer.push(line);
        continue;
      } else if (tableBuffer.length > 0) {
        html += renderTable(tableBuffer);
        tableBuffer = [];
      }

      // 水平线
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
        html += '<hr>\n';
        continue;
      }

      // 标题
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = renderInline(headingMatch[2]);
        html += `<h${level}>${content}</h${level}>\n`;
        continue;
      }

      // 引用
      const bqMatch = line.match(/^>\s?(.*)$/);
      if (bqMatch) {
        if (!inBlockquote) {
          html += '<blockquote>\n';
          inBlockquote = true;
        }
        html += `<p>${renderInline(bqMatch[1])}</p>\n`;
        continue;
      } else if (inBlockquote) {
        html += '</blockquote>\n';
        inBlockquote = false;
      }

      // 无序列表
      const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (ulMatch) {
        const indent = ulMatch[1].length;
        const content = renderInline(ulMatch[2]);
        if (!inList || listType !== 'ul') {
          if (inList) html += '</li></ul>\n';
          html += '<ul>\n';
          inList = true;
          listType = 'ul';
        }
        html += `<li>${content}</li>\n`;
        continue;
      }

      // 有序列表
      const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
      if (olMatch) {
        const indent = olMatch[1].length;
        const content = renderInline(olMatch[2]);
        if (!inList || listType !== 'ol') {
          if (inList) html += '</li></ul>\n';
          html += '<ol>\n';
          inList = true;
          listType = 'ol';
        }
        html += `<li>${content}</li>\n`;
        continue;
      }

      if (inList) {
        html += '</li></ul>\n';
        inList = false;
      }

      // 普通段落
      if (line.trim()) {
        html += `<p>${renderInline(line)}</p>\n`;
      }
    }

    // 清理未关闭的标签
    if (inCodeBlock) html += '</code></pre>\n';
    if (inList) html += '</li></ul>\n';
    if (inBlockquote) html += '</blockquote>\n';
    if (tableBuffer.length > 0) html += renderTable(tableBuffer);

    return html;
  }

  // ========== 行内渲染 ==========
  function renderInline(text) {
    let result = escapeHtml(text);

    // 图片 ![alt](url)
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

    // 链接 [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 粗体 **text** 或 __text__
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 斜体 *text* 或 _text_
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 行内代码 `code`
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 删除线 ~~text~~
    result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    return result;
  }

  // ========== 表格渲染 ==========
  function renderTable(rows) {
    if (rows.length < 1) return '';
    let html = '<table>\n';
    let headerDone = false;

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].split('|').filter(c => c.trim() !== '');

      // 跳过对齐行 (|---|)
      if (cells.length > 0 && /^[\s:-]+$/.test(cells[0].trim())) {
        continue;
      }

      if (i === 0) {
        html += '<thead><tr>';
        for (const cell of cells) {
          html += `<th>${renderInline(cell.trim())}</th>`;
        }
        html += '</tr></thead>\n';
      } else {
        if (!headerDone && i === 1) {
          // 如果第二行是分隔行，跳过
          const cellText = cells.map(c => c.trim()).join('');
          if (/^[\s:-]+$/.test(cellText)) continue;
        }
        html += '<tr>';
        for (const cell of cells) {
          html += `<td>${renderInline(cell.trim())}</td>`;
        }
        html += '</tr>\n';
      }
    }

    html += '</table>\n';
    return html;
  }

  // ========== 更新预览 ==========
  function updatePreview() {
    const text = mdInput.value;
    const html = parseMarkdown(text);
    mdPreview.innerHTML = html;

    // 更新统计
    const chars = text.replace(/\s/g, '').length;
    const lines = text.split('\n').length;
    wordCount.textContent = chars;
    lineCount.textContent = lines;
  }

  // ========== 导出 HTML ==========
  function exportHtml() {
    const text = mdInput.value;
    const html = parseMarkdown(text);
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown 导出的文档</title>
  <style>
    body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #333; }
    h1, h2, h3 { margin-top: 1.5em; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #4f46e5; padding-left: 16px; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    img { max-width: 100%; }
    hr { border: none; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
    downloadFile(fullHtml, 'markdown-export.html', 'text/html');
  }

  // ========== 下载 .md ==========
  function downloadMd() {
    downloadFile(mdInput.value, 'markdown-document.md', 'text/markdown');
  }

  // ========== 清空 ==========
  function clearEditor() {
    if (mdInput.value.trim() && !confirm('确定要清空所有内容吗？')) return;
    mdInput.value = '# 欢迎使用 Markdown 编辑器\n\n在这里开始写作...';
    updatePreview();
  }

  // ========== 实时预览 (防抖) ==========
  mdInput.addEventListener('input', debounce(updatePreview, 200));

  // ========== 事件绑定 ==========
  exportBtn.addEventListener('click', exportHtml);
  downloadBtn.addEventListener('click', downloadMd);
  clearBtn.addEventListener('click', clearEditor);

  // ========== 快捷键 ==========
  mdInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      downloadMd();
    }
  });

  // ========== 初始化 ==========
  updatePreview();
})();
