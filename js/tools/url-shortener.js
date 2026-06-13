/* ============================================
   短链接生成器
   使用 is.gd 免费 API 服务
   ============================================ */
(function() {
  const longUrl = document.getElementById('longUrl');
  const shortenBtn = document.getElementById('shortenBtn');
  const shortUrl = document.getElementById('shortUrl');
  const resultGroup = document.getElementById('resultGroup');
  const copyBtn = document.getElementById('copyShortBtn');
  const openBtn = document.getElementById('openShortBtn');
  const history = document.getElementById('shortenHistory');
  const clearBtn = document.getElementById('clearHistoryBtn');
  const originalLength = document.getElementById('originalLength');

  // ========== 生成短链接 ==========
  async function shorten() {
    const url = longUrl.value.trim();
    if (!url) { alert('请输入链接地址'); return; }

    // 简单 URL 校验
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('请输入以 http:// 或 https:// 开头的完整网址');
      return;
    }

    shortenBtn.disabled = true;
    shortenBtn.textContent = '⏳ 生成中...';

    try {
      const api = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;
      const response = await fetch(api);

      if (!response.ok) throw new Error('服务暂时不可用');

      const result = await response.text();

      // is.gd 返回错误时以 "Error:" 开头
      if (result.startsWith('Error:')) {
        throw new Error(result);
      }

      const shortLink = result.trim();
      shortUrl.value = shortLink;
      resultGroup.style.display = 'block';
      originalLength.textContent = `原始长度: ${url.length} 字符 → 缩短后: ${shortLink.length} 字符`;

      // 保存历史
      saveHistory(url, shortLink);
      renderHistory();

      // 自动选中
      shortUrl.select();

    } catch (err) {
      alert('生成失败: ' + err.message + '\n\n请检查网址是否正确，或稍后重试。');
    } finally {
      shortenBtn.disabled = false;
      shortenBtn.textContent = '🔗 生成短链';
    }
  }

  // ========== 历史记录 (localStorage) ==========
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('shortenHistory') || '[]');
    } catch { return []; }
  }

  function saveHistory(original, short) {
    const items = getHistory();
    items.unshift({
      original,
      short,
      time: new Date().toLocaleString()
    });
    if (items.length > 50) items.pop();
    localStorage.setItem('shortenHistory', JSON.stringify(items));
  }

  function renderHistory() {
    const items = getHistory();
    if (items.length === 0) {
      history.innerHTML = '<div style="color:var(--text-muted);">暂无记录</div>';
      return;
    }
    history.innerHTML = items.map((item, i) =>
      `<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.8rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(item.original)}">${escapeHtml(item.original)}</div>
          <div><a href="${escapeHtml(item.short)}" target="_blank" rel="noopener" style="font-weight:500;">${escapeHtml(item.short)}</a></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <span style="font-size:0.75rem;color:var(--text-muted);">${item.time}</span>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.78rem;" onclick="(function(){navigator.clipboard.writeText('${item.short.replace(/'/g, "\\'")}').then(()=>showCopyToast())})()">复制</button>
        </div>
      </div>`
    ).join('');
  }

  // ========== 清空历史 ==========
  clearBtn.addEventListener('click', () => {
    if (!confirm('确定要清空所有历史记录吗？')) return;
    localStorage.removeItem('shortenHistory');
    renderHistory();
  });

  // ========== 点击复制 ==========
  copyBtn.addEventListener('click', () => {
    if (shortUrl.value) copyToClipboard(shortUrl.value);
  });

  // ========== 在新窗口打开 ==========
  openBtn.addEventListener('click', () => {
    if (shortUrl.value) window.open(shortUrl.value, '_blank');
  });

  // ========== 回车键 ==========
  longUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') shorten();
  });

  // ========== 绑定事件 ==========
  shortenBtn.addEventListener('click', shorten);

  // ========== 初始化历史 ==========
  renderHistory();
})();
