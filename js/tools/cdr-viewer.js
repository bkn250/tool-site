/* ============================================
   CDR 查看器
   CDR X4+ 是 ZIP 格式，解析提取预览图和结构信息
   ============================================ */
(function() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const viewerPanel = document.getElementById('viewerPanel');
  const fileName = document.getElementById('fileName');
  const fileMeta = document.getElementById('fileMeta');
  const previewImage = document.getElementById('previewImage');
  const noPreview = document.getElementById('noPreview');
  const pageList = document.getElementById('pageList');
  const pageCount = document.getElementById('pageCount');
  const resetBtn = document.getElementById('resetBtn');
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportInfoBtn = document.getElementById('exportInfoBtn');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');

  let currentPreviewUrl = null;
  let fileInfoText = '';

  // ========== 上传 ==========
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) processFile(fileInput.files[0]);
  });

  async function processFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'cdr') {
      alert('请选择 .cdr 文件（CorelDRAW 格式）');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert('文件不能超过 100MB');
      return;
    }

    uploadArea.style.display = 'none';
    viewerPanel.style.display = 'block';
    fileName.textContent = file.name;
    fileMeta.textContent = `大小: ${formatFileSize(file.size)} | 解析中...`;
    pageList.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;">⏳ 正在解析 CDR 文件...</div>';
    previewImage.style.display = 'none';
    noPreview.style.display = 'block';
    progressBar.style.display = 'block';
    progressFill.style.width = '10%';
    currentPreviewUrl = null;
    exportPngBtn.disabled = true;

    try {
      const buf = await file.arrayBuffer();
      progressFill.style.width = '30%';

      // 尝试作为 ZIP 解析（CDR X4+ 是 ZIP 格式）
      let zip;
      try {
        zip = await JSZip.loadAsync(buf);
        progressFill.style.width = '50%';
      } catch (e) {
        // 不是 ZIP 格式，可能是旧版 CDR
        handleOldCdr(file, buf);
        return;
      }

      // 收集所有文件
      const files = [];
      const imageFiles = [];
      const xmlFiles = [];
      const otherFiles = [];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        files.push(relativePath);
        const low = relativePath.toLowerCase();
        if (/\.(png|jpe?g|bmp|gif|tiff?|webp)$/i.test(low)) {
          imageFiles.push(relativePath);
        } else if (/\.(xml|rels)$/i.test(low)) {
          xmlFiles.push(relativePath);
        } else {
          otherFiles.push(relativePath);
        }
      });

      progressFill.style.width = '70%';

      // 查找最佳预览图
      // 优先级: preview > thumbnail > page1 > 最大图片
      let previewPath = null;
      const previewKeywords = ['preview', 'thumbnail', 'thumb', 'page1', 'pag1', 'page_1'];

      // 先按关键词找
      for (const kw of previewKeywords) {
        for (const img of imageFiles) {
          if (img.toLowerCase().includes(kw)) {
            previewPath = img;
            break;
          }
        }
        if (previewPath) break;
      }

      // 如果没找到关键词匹配的，找最大的图片
      if (!previewPath && imageFiles.length > 0) {
        let maxSize = 0;
        for (const img of imageFiles) {
          const entry = zip.file(img);
          // 粗略：文件名包含数字的优先
          const size = entry._data ? entry._data.uncompressedSize || 0 : 0;
          if (size > maxSize) {
            maxSize = size;
            previewPath = img;
          }
        }
        // 如果还不行，就用第一个
        if (!previewPath && imageFiles.length > 0) {
          previewPath = imageFiles[0];
        }
      }

      // 提取预览图
      if (previewPath) {
        const imgEntry = zip.file(previewPath);
        const imgData = await imgEntry.async('blob');
        currentPreviewUrl = URL.createObjectURL(imgData);
        previewImage.src = currentPreviewUrl;
        previewImage.style.display = 'block';
        noPreview.style.display = 'none';
        exportPngBtn.disabled = false;
      }

      progressFill.style.width = '90%';

      // 渲染文件结构
      let infoHtml = '';

      if (imageFiles.length > 0) {
        infoHtml += '<div style="font-weight:600;color:var(--text);padding:6px 0;font-size:0.85rem;">🖼️ 图片文件 (' + imageFiles.length + '个)</div>';
        for (const img of imageFiles) {
          const isPreview = img === previewPath;
          infoHtml += '<div style="padding:3px 12px;font-size:0.8rem;color:var(--text-secondary);' + (isPreview ? 'background:var(--primary-light);border-radius:4px;font-weight:500;' : '') + '">' + (isPreview ? '👁️ ' : '📷 ') + img + '</div>';
        }
      }

      if (xmlFiles.length > 0) {
        infoHtml += '<div style="font-weight:600;color:var(--text);padding:6px 0;font-size:0.85rem;margin-top:6px;">📋 XML/元数据 (' + xmlFiles.length + '个)</div>';
        for (const xml of xmlFiles.slice(0, 20)) {
          infoHtml += '<div style="padding:3px 12px;font-size:0.78rem;color:var(--text-muted);">📄 ' + xml + '</div>';
        }
        if (xmlFiles.length > 20) {
          infoHtml += '<div style="padding:3px 12px;font-size:0.78rem;color:var(--text-muted);">...还有 ' + (xmlFiles.length - 20) + ' 个文件</div>';
        }
      }

      if (otherFiles.length > 0 && otherFiles.length <= 10) {
        infoHtml += '<div style="font-weight:600;color:var(--text);padding:6px 0;font-size:0.85rem;margin-top:6px;">📦 其他文件</div>';
        for (const f of otherFiles) {
          infoHtml += '<div style="padding:3px 12px;font-size:0.78rem;color:var(--text-muted);">📎 ' + f + '</div>';
        }
      }

      pageList.innerHTML = infoHtml || '<div style="color:var(--text-muted);text-align:center;padding:20px;">暂无内容结构</div>';
      pageCount.textContent = '共 ' + files.length + ' 个文件';

      fileMeta.textContent = `大小: ${formatFileSize(file.size)} | 图片: ${imageFiles.length} | 总文件: ${files.length}`;
      if (previewPath) {
        fileMeta.textContent += ' | ✅ 预览已加载';
      }

      // 构建信息文本
      fileInfoText = `文件名: ${file.name}\n大小: ${formatFileSize(file.size)}\n图片数: ${imageFiles.length}\nXML数: ${xmlFiles.length}\n总文件: ${files.length}\n\n图片列表:\n${imageFiles.join('\n')}`;

      progressFill.style.width = '100%';
      setTimeout(() => { progressBar.style.display = 'none'; }, 800);

    } catch (err) {
      pageList.innerHTML = '<div style="color:var(--danger);text-align:center;padding:20px;">❌ 解析失败: ' + err.message + '</div>';
      fileMeta.textContent = '❌ 解析失败';
      progressBar.style.display = 'none';
    }
  }

  // ========== 旧版 CDR 处理 ==========
  function handleOldCdr(file, buf) {
    // 旧版 CDR 不是 ZIP 格式，尝试提取嵌入的缩略图
    // 搜索 PNG/JPG 文件签名
    const arr = new Uint8Array(buf);
    const signatures = [
      { sig: [0x89, 0x50, 0x4E, 0x47], ext: 'png', mime: 'image/png' },
      { sig: [0xFF, 0xD8, 0xFF], ext: 'jpg', mime: 'image/jpeg' },
    ];

    let found = false;
    for (const s of signatures) {
      for (let i = 0; i < arr.length - s.sig.length; i++) {
        let match = true;
        for (let j = 0; j < s.sig.length; j++) {
          if (arr[i + j] !== s.sig[j]) { match = false; break; }
        }
        if (match) {
          // 提取从签名位置到文件末尾（或下一个签名）的数据
          const end = Math.min(i + 5 * 1024 * 1024, arr.length); // 最多5MB
          const blob = new Blob([arr.slice(i, end)], { type: s.mime });
          currentPreviewUrl = URL.createObjectURL(blob);
          previewImage.src = currentPreviewUrl;
          previewImage.style.display = 'block';
          noPreview.style.display = 'none';
          exportPngBtn.disabled = false;
          found = true;

          pageList.innerHTML = '<div style="padding:12px;color:var(--text-secondary);font-size:0.85rem;">⚠️ 这是旧版 CDR 格式（非ZIP结构），仅能提取嵌入的预览图。建议用 CorelDRAW 另存为新版格式以获得更好兼容性。</div>';
          pageCount.textContent = '旧版 CDR（有限支持）';
          fileMeta.textContent = `大小: ${formatFileSize(file.size)} | ⚠️ 旧版格式 | 仅预览`;
          fileInfoText = `文件名: ${file.name}\n大小: ${formatFileSize(file.size)}\n格式: 旧版 CDR（非ZIP）\n注意: 仅提取了嵌入预览图`;
          progressBar.style.display = 'none';
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      pageList.innerHTML = '<div style="padding:20px;text-align:center;"><div style="font-size:2rem;margin-bottom:8px;">😔</div><p style="color:var(--text-secondary);">无法识别此 CDR 文件</p><p style="font-size:0.8rem;color:var(--text-muted);">可能是旧版格式或文件已损坏。<br>建议用 CorelDRAW 打开后另存为 X4 以上版本。</p></div>';
      fileMeta.textContent = '❌ 无法识别';
      progressBar.style.display = 'none';
    }
  }

  // ========== 导出 ==========
  exportPngBtn.addEventListener('click', () => {
    if (!currentPreviewUrl) return;
    const a = document.createElement('a');
    a.href = currentPreviewUrl;
    a.download = (fileName.textContent || 'cdr').replace(/\.cdr$/i, '') + '_预览.png';
    a.click();
  });

  exportInfoBtn.addEventListener('click', () => {
    if (fileInfoText) copyToClipboard(fileInfoText);
  });

  // ========== 重置 ==========
  resetBtn.addEventListener('click', () => {
    uploadArea.style.display = '';
    viewerPanel.style.display = 'none';
    fileInput.value = '';
    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
    previewImage.src = '';
    previewImage.style.display = 'none';
    pageList.innerHTML = '';
    pageCount.textContent = '';
    progressBar.style.display = 'none';
    exportPngBtn.disabled = true;
  });
})();
