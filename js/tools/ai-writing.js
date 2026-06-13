/* ============================================
   AI 写作助手 - 基于 DeepSeek API
   ============================================ */
(function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const toggleKeyBtn = document.getElementById('toggleKeyBtn');
  const keyStatus = document.getElementById('keyStatus');
  const topicInput = document.getElementById('aiTopic');
  const topicCount = document.getElementById('topicCount');
  const generateBtn = document.getElementById('generateBtn');
  const stopBtn = document.getElementById('stopBtn');
  const clearBtn = document.getElementById('clearAiBtn');
  const output = document.getElementById('aiOutput');
  const thinkingBubble = document.getElementById('thinkingBubble');
  const thinkingHint = document.getElementById('thinkingHint');
  const copyBtn = document.getElementById('copyAiBtn');
  const downloadBtn = document.getElementById('downloadAiBtn');
  const outputWordCount = document.getElementById('outputWordCount');
  const modeBtns = document.querySelectorAll('.writing-mode-btn');
  const modelRadios = document.querySelectorAll('input[name="aimodel"]');

  let controller = null;
  let currentOutput = '';

  // ========== API Key 管理 (localStorage) ==========
  const savedKey = localStorage.getItem('deepseek_api_key');
  if (savedKey) {
    apiKeyInput.value = savedKey;
    keyStatus.style.display = 'block';
    keyStatus.textContent = '✅ Key 已保存（本地存储）';
  }

  saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) { alert('请输入 API Key'); return; }
    if (!key.startsWith('sk-')) { alert('API Key 格式不正确，应以 sk- 开头'); return; }
    localStorage.setItem('deepseek_api_key', key);
    keyStatus.style.display = 'block';
    keyStatus.textContent = '✅ Key 已保存到本地';
    setTimeout(() => keyStatus.style.display = 'none', 3000);
  });

  toggleKeyBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    toggleKeyBtn.textContent = apiKeyInput.type === 'password' ? '👁️' : '🔒';
  });

  // ========== 字数统计 ==========
  topicInput.addEventListener('input', () => {
    topicCount.textContent = topicInput.value.length;
  });

  // ========== 写作模式切换 ==========
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ========== 生成 ==========
  async function generate() {
    const key = apiKeyInput.value.trim();
    if (!key) { alert('请先填写并保存 DeepSeek API Key'); return; }

    const topic = topicInput.value.trim();
    if (!topic) { alert('请输入写作主题或内容'); return; }

    const activeMode = document.querySelector('.writing-mode-btn.active');
    let prompt = activeMode ? activeMode.dataset.prompt : '请帮我写一篇关于【{topic}】的文章。';
    prompt = prompt.replace('{topic}', topic);

    let model = 'deepseek-v4-flash';
    modelRadios.forEach(r => { if (r.checked) model = r.value; });

    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ 生成中...';
    stopBtn.style.display = 'inline-flex';
    thinkingBubble.style.display = 'block';
    thinkingHint.textContent = '正在生成内容，请稍候...';
    output.innerHTML = '';
    currentOutput = '';

    controller = new AbortController();

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: '你是一个专业的写作助手，擅长各种类型的中文写作。请根据用户的要求生成高质量、原创的内容。直接输出内容，不要加额外的解释说明。' },
            { role: 'user', content: prompt }
          ],
          stream: true,
          temperature: 0.8,
          max_tokens: 4096
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err.includes('insufficient_balance') ? 'API 余额不足，请到 platform.deepseek.com 充值' :
                       err.includes('invalid_api_key') ? 'API Key 无效，请检查是否正确' :
                       '请求失败: HTTP ' + response.status);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              currentOutput += content;
              output.innerHTML = escapeHtml(currentOutput).replace(/\n/g, '<br>') + '<span class="streaming-cursor"></span>';
              // 更新字数
              updateWordCount();
            }
          } catch (e) { /* 忽略解析错误 */ }
        }
      }

      output.innerHTML = escapeHtml(currentOutput).replace(/\n/g, '<br>');
      updateWordCount();
      thinkingBubble.style.display = 'none';

    } catch (err) {
      if (err.name === 'AbortError') {
        output.innerHTML = escapeHtml(currentOutput).replace(/\n/g, '<br>') + '\n\n--- 已停止 ---';
      } else {
        output.innerHTML = '❌ ' + err.message;
      }
      thinkingBubble.style.display = 'none';
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '✨ 开始生成';
      stopBtn.style.display = 'none';
    }
  }

  function updateWordCount() {
    const chars = currentOutput.replace(/\s/g, '').length;
    outputWordCount.textContent = `（${chars} 字）`;
  }

  // ========== 停止 ==========
  stopBtn.addEventListener('click', () => {
    if (controller) controller.abort();
  });

  // ========== 清空 ==========
  clearBtn.addEventListener('click', () => {
    topicInput.value = '';
    output.innerHTML = '点击"开始生成"生成内容...';
    currentOutput = '';
    outputWordCount.textContent = '';
    topicCount.textContent = '0';
  });

  // ========== 复制 ==========
  copyBtn.addEventListener('click', () => {
    if (currentOutput) copyToClipboard(currentOutput);
  });

  // ========== 下载 ==========
  downloadBtn.addEventListener('click', () => {
    if (currentOutput) downloadFile(currentOutput, 'AI写作_' + (topicInput.value.slice(0, 10) || '无题') + '.txt', 'text/plain');
  });

  // ========== 绑定 ==========
  generateBtn.addEventListener('click', generate);

  // Ctrl+Enter 快速生成
  topicInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
  });
})();
