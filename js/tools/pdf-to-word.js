/* ============================================
   PDF 转 Word 工具
   使用 PDF.js 解析 + docx 库生成 Word 文档
   ============================================ */
(function() {
  const uploadArea = document.getElementById('pdfUpload');
  const fileInput = document.getElementById('pdfFileInput');
  const panel = document.getElementById('pdfPanel');
  const fileName = document.getElementById('pdfFileName');
  const fileInfo = document.getElementById('pdfFileInfo');
  const statusEl = document.getElementById('pdfStatus');
  const progress = document.getElementById('pdfProgress');
  const progressText = document.getElementById('pdfProgressText');
  const progressPercent = document.getElementById('pdfProgressPercent');
  const progressBar = document.getElementById('pdfProgressBar');
  const textResult = document.getElementById('pdfTextResult');
  const totalChars = document.getElementById('totalChars');
  const convertBtn = document.getElementById('convertBtn');
  const resetBtn = document.getElementById('pdfResetBtn');
  const downloadWordBtn = document.getElementById('downloadWordBtn');
  const downloadTxtBtn = document.getElementById('downloadTxtBtn');
  const copyBtn = document.getElementById('copyPdfTextBtn');
  const pagesPreview = document.getElementById('pdfPagesPreview');

  let pdfDoc = null;
  let pdfFileName = '';
  let pdfFileSize = 0;
  let isConverting = false;

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

  async function handleFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('请选择 PDF 文件');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('PDF 文件不能超过 50MB');
      return;
    }

    pdfFileName = file.name;
    pdfFileSize = file.size;
    fileName.textContent = pdfFileName;
    fileInfo.textContent = `大小: ${formatFileSize(pdfFileSize)}`;
    statusEl.textContent = '📄 解析中...';

    uploadArea.style.display = 'none';
    panel.style.display = 'block';
    progress.style.display = 'block';
    progressText.textContent = '正在解析 PDF...';
    progressPercent.textContent = '0%';
    progressBar.style.width = '0%';
    textResult.value = '';
    pagesPreview.innerHTML = '';

    // 读取文件为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    try {
      pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;
      fileInfo.textContent = `页数: ${numPages} 页 | 大小: ${formatFileSize(pdfFileSize)}`;
      statusEl.textContent = `📄 ${numPages} 页已加载`;

      progressText.textContent = `已加载 ${numPages} 页，提取文字中...`;
      progressPercent.textContent = '';

      // 提取所有页文字
      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');

        fullText += `--- 第 ${i} 页 ---\n${pageText}\n\n`;

        // 更新进度
        const pct = Math.round((i / numPages) * 100);
        progressBar.style.width = pct + '%';
        progressPercent.textContent = pct + '%';
        progressText.textContent = `正在提取第 ${i}/${numPages} 页...`;
      }

      textResult.value = fullText.trim();
      updateCharCount();

      // 渲染页面预览缩略图
      renderPageThumbnails();

      progressText.textContent = '✅ 解析完成！';
      progressBar.style.width = '100%';
      progressPercent.textContent = '100%';
      setTimeout(() => { progress.style.display = 'none'; }, 1500);

    } catch (err) {
      textResult.value = '❌ PDF 解析失败: ' + err.message + '\n\n可能的原因：\n1. 文件不是有效的 PDF 格式\n2. PDF 文件已损坏\n3. PDF 受密码保护';
      progressText.textContent = '❌ 解析失败';
      progressPercent.textContent = '';
      statusEl.textContent = '❌ 解析失败';
    }
  }

  // ========== 渲染页面缩略图 ==========
  async function renderPageThumbnails() {
    if (!pdfDoc) return;
    pagesPreview.innerHTML = '';

    // 只渲染前 10 页预览
    const maxPages = Math.min(pdfDoc.numPages, 10);

    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border);';
        wrapper.innerHTML = `
          <canvas width="${viewport.width}" height="${viewport.height}" style="width:120px;height:auto;border-radius:4px;flex-shrink:0;"></canvas>
          <div style="flex:1;font-size:0.85rem;color:var(--text-secondary);">
            <strong>第 ${i} 页</strong>
          </div>
        `;
        wrapper.querySelector('canvas').getContext('2d').drawImage(canvas, 0, 0);
        pagesPreview.appendChild(wrapper);
      } catch (e) {
        // 跳过渲染失败的页面
      }
    }

    if (pdfDoc.numPages > 10) {
      const more = document.createElement('div');
      more.style.cssText = 'text-align:center;padding:8px;color:var(--text-muted);font-size:0.85rem;';
      more.textContent = `...还有 ${pdfDoc.numPages - 10} 页未预览`;
      pagesPreview.appendChild(more);
    }
  }

  // ========== 转换为 Word ==========
  async function convertToWord() {
    if (!pdfDoc) { alert('请先上传 PDF 文件'); return; }
    if (isConverting) return;

    const text = textResult.value.trim();
    if (!text) { alert('没有文本内容可以导出'); return; }

    isConverting = true;
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<span class="spinner"></span> 生成中...';
    statusEl.textContent = '📄 生成 Word 中...';

    try {
      // 检查 docx 库是否加载
      if (typeof docx === 'undefined') {
        throw new Error('docx 库未加载，请检查网络连接后刷新页面重试');
      }

      const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, HeadingLevel, PageNumber } = docx;

      // 按段落分割文本
      const lines = text.split('\n');
      const paragraphs = [];

      for (const line of lines) {
        if (line.startsWith('--- 第') && line.endsWith('页 ---')) {
          // 页面标题
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line, bold: true, size: 28, color: '4F46E5' })],
              spacing: { before: 400, after: 200 },
              alignment: AlignmentType.CENTER,
            })
          );
        } else if (line.trim() === '') {
          paragraphs.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
        } else {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 22 })],
              spacing: { after: 120 },
              indent: { firstLine: 400 },
            })
          );
        }
      }

      const doc = new Document({
        title: pdfFileName.replace('.pdf', ''),
        description: '由在线工具箱 PDF 转 Word 工具生成',
        styles: {
          default: {
            document: {
              run: { font: 'Microsoft YaHei' },
              paragraph: { spacing: { after: 120 } },
            },
          },
        },
        sections: [{
          properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
          headers: {
            default: new Header({
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: pdfFileName.replace('.pdf', ''), size: 18, color: '999999' })],
              })],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: '第 ', size: 18, color: '999999' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '999999' }),
                  new TextRun({ text: ' 页', size: 18, color: '999999' }),
                ],
              })],
            }),
          },
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const wordFileName = pdfFileName.replace(/\.pdf$/i, '') + '.docx';
      downloadBlob(blob, wordFileName);
      statusEl.textContent = '✅ Word 已下载';

    } catch (err) {
      alert('生成 Word 失败: ' + err.message);
      statusEl.textContent = '❌ 生成失败';
    } finally {
      isConverting = false;
      convertBtn.disabled = false;
      convertBtn.innerHTML = '🔄 转换为 Word';
    }
  }

  // ========== 更新字符统计 ==========
  function updateCharCount() {
    const text = textResult.value;
    totalChars.textContent = `${text.length} 字符 | ${text.split('\n').length} 行`;
  }
  textResult.addEventListener('input', updateCharCount);

  // ========== 下载 .txt ==========
  function downloadTxt() {
    const text = textResult.value.trim();
    if (!text) { alert('没有内容可以导出'); return; }
    const name = pdfFileName ? pdfFileName.replace(/\.pdf$/i, '') + '.txt' : 'PDF提取文字.txt';
    downloadFile(text, name, 'text/plain;charset=utf-8');
  }

  // ========== 复制 ==========
  copyBtn.addEventListener('click', () => {
    if (textResult.value) copyToClipboard(textResult.value);
  });

  // ========== 重置 ==========
  resetBtn.addEventListener('click', () => {
    uploadArea.style.display = '';
    panel.style.display = 'none';
    fileInput.value = '';
    pdfDoc = null;
    textResult.value = '';
    statusEl.textContent = '📄 待上传';
    pagesPreview.innerHTML = '';
    progress.style.display = 'none';
  });

  // ========== 事件绑定 ==========
  convertBtn.addEventListener('click', convertToWord);
  downloadWordBtn.addEventListener('click', convertToWord);
  downloadTxtBtn.addEventListener('click', downloadTxt);
})();
