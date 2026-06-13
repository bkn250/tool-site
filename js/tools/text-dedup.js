(function() {
  const input = document.getElementById('dedupInput');
  const output = document.getElementById('dedupOutput');
  const stats = document.getElementById('dedupStats');
  const dedupBtn = document.getElementById('dedupBtn');
  const sortBtn = document.getElementById('sortBtn');
  const countBtn = document.getElementById('countBtn');
  const clearBtn = document.getElementById('clearDedupBtn');
  const copyBtn = document.getElementById('copyDedupBtn');
  const downloadBtn = document.getElementById('downloadDedupBtn');

  function getLines() { return input.value.split('\n').filter(l => l.trim() !== ''); }

  dedupBtn.addEventListener('click', () => {
    const lines = getLines();
    const unique = [...new Set(lines)];
    output.value = unique.join('\n');
    stats.textContent = `去重前: ${lines.length} 行 → 去重后: ${unique.length} 行 (删除了 ${lines.length - unique.length} 行重复)`;
  });

  sortBtn.addEventListener('click', () => {
    const lines = getLines();
    const sorted = [...new Set(lines)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    output.value = sorted.join('\n');
    stats.textContent = `共 ${sorted.length} 行，已按字母排序`;
  });

  countBtn.addEventListener('click', () => {
    const lines = getLines();
    const freq = {};
    lines.forEach(l => { freq[l] = (freq[l] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    output.value = sorted.map(([text, count]) => `[${count}次] ${text}`).join('\n');
    stats.textContent = `共 ${sorted.length} 个唯一值，总 ${lines.length} 行`;
  });

  clearBtn.addEventListener('click', () => { input.value = ''; output.value = ''; stats.textContent = ''; });
  copyBtn.addEventListener('click', () => { if(output.value) copyToClipboard(output.value); });
  downloadBtn.addEventListener('click', () => { if(output.value) downloadFile(output.value, '去重结果.txt', 'text/plain'); });
})();
