/* ============================================
   JSON 格式化工具
   ============================================ */

(function() {
  const jsonInput = document.getElementById('jsonInput');
  const jsonOutput = document.getElementById('jsonOutput');
  const jsonStatus = document.getElementById('jsonStatus');
  const jsonError = document.getElementById('jsonError');
  const formatBtn = document.getElementById('formatBtn');
  const compressBtn = document.getElementById('compressBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');

  // ========== 格式化 JSON ==========
  function formatJSON() {
    const input = jsonInput.value.trim();
    if (!input) {
      jsonOutput.textContent = '请输入 JSON 数据';
      jsonOutput.className = 'output-area';
      jsonError.style.display = 'none';
      updateStats(0);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      jsonOutput.textContent = formatted;
      jsonOutput.className = 'output-area has-content';
      jsonError.style.display = 'none';
      updateStats(formatted.length);

      // 语法高亮（根据缩进层级着色）
      // 不依赖外部库，保持纯文本

    } catch (e) {
      jsonOutput.textContent = '';
      jsonOutput.className = 'output-area';
      jsonError.style.display = 'block';
      jsonError.className = 'alert alert-danger';

      // 尝试定位错误位置
      const match = e.message.match(/position\s+(\d+)/i);
      if (match) {
        const pos = parseInt(match[1]);
        const line = input.substring(0, pos).split('\n').length;
        const col = pos - input.substring(0, pos).lastIndexOf('\n');
        jsonError.innerHTML = `<strong>❌ JSON 解析错误</strong><br>
          位置: 第 ${line} 行 第 ${col} 列<br>
          错误信息: ${e.message.replace(/\bposition\s+\d+\b/i, `位置 ${pos}`)}`;
      } else {
        jsonError.innerHTML = `<strong>❌ JSON 解析错误</strong><br>${e.message}`;
      }
      updateStats(0);
    }
  }

  // ========== 压缩 JSON ==========
  function compressJSON() {
    const input = jsonInput.value.trim();
    if (!input) {
      jsonOutput.textContent = '请输入 JSON 数据';
      jsonOutput.className = 'output-area';
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const compressed = JSON.stringify(parsed);
      jsonOutput.textContent = compressed;
      jsonOutput.className = 'output-area has-content';
      jsonError.style.display = 'none';
      updateStats(compressed.length);
    } catch (e) {
      jsonError.style.display = 'block';
      jsonError.className = 'alert alert-danger';
      jsonError.innerHTML = `<strong>❌ JSON 解析错误</strong><br>${e.message}`;
    }
  }

  // ========== 更新统计 ==========
  function updateStats(outputLength) {
    const input = jsonInput.value;
    const lines = input.split('\n').length;
    const chars = input.length;
    jsonStatus.textContent = `行数: ${lines} | 字符数: ${chars}` +
      (outputLength > 0 ? ` | 输出长度: ${outputLength} 字符` : '');
  }

  // ========== 清空 ==========
  function clearAll() {
    jsonInput.value = '';
    jsonOutput.textContent = '等待输入...';
    jsonOutput.className = 'output-area';
    jsonError.style.display = 'none';
    updateStats(0);
  }

  // ========== 复制结果 ==========
  function copyResult() {
    const text = jsonOutput.textContent;
    if (text && text !== '等待输入...' && text !== '请输入 JSON 数据') {
      copyToClipboard(text);
    }
  }

  // ========== 实时统计 (防抖) ==========
  jsonInput.addEventListener('input', debounce(() => {
    updateStats(0);
  }, 300));

  // ========== 快捷键 ==========
  jsonInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      formatJSON();
    }
  });

  // ========== 绑定事件 ==========
  formatBtn.addEventListener('click', formatJSON);
  compressBtn.addEventListener('click', compressJSON);
  clearBtn.addEventListener('click', clearAll);
  copyBtn.addEventListener('click', copyResult);

  // ========== 初始化 ==========
  clearAll();
})();
