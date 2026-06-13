/* ============================================
   图片转文字 OCR 工具
   使用 Tesseract.js 在浏览器端完成识别
   ============================================ */
(function() {
  const uploadArea = document.getElementById('ocrUpload');
  const fileInput = document.getElementById('ocrFileInput');
  const panel = document.getElementById('ocrPanel');
  const preview = document.getElementById('ocrPreview');
  const recognizeBtn = document.getElementById('recognizeBtn');
  const resetBtn = document.getElementById('ocrResetBtn');
  const resultArea = document.getElementById('ocrResult');
  const copyBtn = document.getElementById('copyOcrBtn');
  const downloadBtn = document.getElementById('downloadOcrBtn');
  const progress = document.getElementById('ocrProgress');
  const progressText = document.getElementById('ocrProgressText');
  const progressPercent = document.getElementById('ocrProgressPercent');
  const progressBar = document.getElementById('ocrProgressBar');
  const langSelect = document.getElementById('ocrLang');
  const statusEl = document.getElementById('ocrStatus');

  let selectedFile = null;
  let Tesseract = null;
  let worker = null;

  // ========== 动态加载 Tesseract.js ==========
  function loadTesseract() {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) {
        Tesseract = window.Tesseract;
        resolve(Tesseract);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = () => {
        Tesseract = window.Tesseract;
        resolve(Tesseract);
      };
      script.onerror = () => reject(new Error('加载识别引擎失败，请检查网络连接'));
      document.head.appendChild(script);
    });
  }

  // ========== 上传处理 ==========
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleFile(fileInput.files[0]); });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    if (file.size > 20 * 1024 * 1024) { alert('图片不能超过 20MB'); return; }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      uploadArea.style.display = 'none';
      panel.style.display = 'block';
      resultArea.value = '';
      statusEl.textContent = '📷 待识别';
    };
    reader.readAsDataURL(file);
  }

  // ========== 执行识别 ==========
  recognizeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    recognizeBtn.disabled = true;
    recognizeBtn.innerHTML = '<span class="spinner"></span> 识别中...';
    progress.style.display = 'block';
    progressText.textContent = '正在加载识别引擎...';
    progressPercent.textContent = '0%';
    progressBar.style.width = '0%';
    resultArea.value = '';

    try {
      await loadTesseract();
      progressText.textContent = '正在识别文字...';
      progressPercent.textContent = '准备中';
      progressBar.style.width = '30%';

      const lang = langSelect.value;
      const result = await Tesseract.recognize(
        preview.src,
        lang,
        {
          logger: (info) => {
            if (info.status === 'recognizing text') {
              const pct = Math.round(info.progress * 100);
              progressBar.style.width = Math.min(30 + pct * 0.7, 100) + '%';
              progressPercent.textContent = pct + '%';
              progressText.textContent = `正在识别... ${pct}%`;
            } else if (info.status === 'loading tesseract core') {
              progressText.textContent = '正在加载识别引擎核心...';
            } else if (info.status === 'initializing tesseract') {
              progressText.textContent = '正在初始化...';
            } else if (info.status === 'loading language traineddata') {
              progressText.textContent = `正在加载语言包: ${lang}...`;
            } else if (info.status === 'initializing api') {
              progressText.textContent = '准备就绪，开始识别...';
            }
          }
        }
      );

      progressText.textContent = '✅ 识别完成';
      progressPercent.textContent = '100%';
      progressBar.style.width = '100%';

      const text = result.data.text.trim();
      resultArea.value = text || '未能识别出文字，请尝试更清晰的图片或更换语言。';
      statusEl.textContent = text ? '✅ 识别完成' : '⚠️ 未识别到文字';

    } catch (err) {
      resultArea.value = '❌ 识别失败: ' + err.message + '\n\n请检查网络连接后重试。如果是网络问题，可以稍后再试。';
      progressText.textContent = '❌ 识别失败';
      progressPercent.textContent = '';
      progressBar.style.width = '0%';
      statusEl.textContent = '❌ 识别失败';
    } finally {
      recognizeBtn.disabled = false;
      recognizeBtn.innerHTML = '🔍 开始识别';
    }
  });

  // ========== 复制 ==========
  copyBtn.addEventListener('click', () => {
    if (resultArea.value) copyToClipboard(resultArea.value);
  });

  // ========== 下载 ==========
  downloadBtn.addEventListener('click', () => {
    if (resultArea.value) downloadFile(resultArea.value, 'OCR识别结果.txt', 'text/plain');
  });

  // ========== 重置 ==========
  resetBtn.addEventListener('click', () => {
    uploadArea.style.display = '';
    panel.style.display = 'none';
    fileInput.value = '';
    selectedFile = null;
    resultArea.value = '';
    progress.style.display = 'none';
    statusEl.textContent = '📷 待识别';
  });
})();
