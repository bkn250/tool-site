/* ============================================
   文本对比工具
   使用 LCS (最长公共子序列) 算法实现行级对比
   ============================================ */

(function() {
  const textA = document.getElementById('textA');
  const textB = document.getElementById('textB');
  const diffOutput = document.getElementById('diffOutput');
  const diffStats = document.getElementById('diffStats');
  const diffBtn = document.getElementById('diffBtn');
  const swapBtn = document.getElementById('swapBtn');
  const clearDiffBtn = document.getElementById('clearDiffBtn');

  // ========== LCS 算法 ==========
  function computeLCS(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = new Array(m + 1);

    for (let i = 0; i <= m; i++) {
      dp[i] = new Array(n + 1).fill(0);
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp;
  }

  // ========== 回溯获取 Diff ==========
  function getDiff(a, b, dp) {
    let i = a.length;
    let j = b.length;
    const result = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        result.unshift({ type: 'unchanged', value: a[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', value: b[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.unshift({ type: 'removed', value: a[i - 1] });
        i--;
      }
    }

    return result;
  }

  // ========== 执行对比 ==========
  function runDiff() {
    const linesA = textA.value.split('\n');
    const linesB = textB.value.split('\n');

    // 去除最后空行
    if (linesA[linesA.length - 1] === '') linesA.pop();
    if (linesB[linesB.length - 1] === '') linesB.pop();

    if (linesA.length === 0 && linesB.length === 0) {
      diffOutput.textContent = '请在两栏中都输入文本';
      diffStats.textContent = '';
      return;
    }

    const dp = computeLCS(linesA, linesB);
    const diff = getDiff(linesA, linesB, dp);

    // 渲染结果
    let html = '';
    let added = 0, removed = 0, unchanged = 0;
    let lineNum = 1;

    for (const item of diff) {
      const line = escapeHtml(item.value || '（空行）');

      if (item.type === 'added') {
        html += `<div class="diff-added" style="padding:2px 8px;border-radius:2px;">+ ${line}</div>`;
        added++;
      } else if (item.type === 'removed') {
        html += `<div class="diff-removed" style="padding:2px 8px;border-radius:2px;">- ${line}</div>`;
        removed++;
      } else {
        html += `<div style="padding:2px 8px;color:var(--text-muted);">  ${line}</div>`;
        unchanged++;
      }
      lineNum++;
    }

    if (!html) {
      html = '<div style="color:var(--text-muted);padding:8px;">两段文本完全相同</div>';
    }

    diffOutput.innerHTML = html;

    // 统计信息
    const totalChanges = added + removed;
    diffStats.textContent = `📊 新增 ${added} 行 | 删除 ${removed} 行 | 未变 ${unchanged} 行 | 共变更 ${totalChanges} 行`;
  }

  // ========== 交换输入 ==========
  function swapInputs() {
    const temp = textA.value;
    textA.value = textB.value;
    textB.value = temp;
    runDiff();
  }

  // ========== 清空 ==========
  function clearAll() {
    textA.value = '';
    textB.value = '';
    diffOutput.textContent = '点击"对比差异"查看结果';
    diffOutput.className = 'output-area';
    diffStats.textContent = '';
  }

  // ========== 快捷键 ==========
  function handleKeyboard(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runDiff();
    }
  }

  textA.addEventListener('keydown', handleKeyboard);
  textB.addEventListener('keydown', handleKeyboard);

  // ========== 绑定事件 ==========
  diffBtn.addEventListener('click', runDiff);
  swapBtn.addEventListener('click', swapInputs);
  clearDiffBtn.addEventListener('click', clearAll);

  // ========== 初始化示例 ==========
  runDiff();
})();
