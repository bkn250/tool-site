/* ============================================
   图片压缩工具
   使用 Canvas API 在浏览器端完成压缩
   ============================================ */

(function() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const controlPanel = document.getElementById('controlPanel');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const originalInfo = document.getElementById('originalInfo');
  const compressedInfo = document.getElementById('compressedInfo');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const formatSelect = document.getElementById('formatSelect');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');

  let originalFile = null;
  let originalDataUrl = null;
  let compressedBlob = null;
  let compressedDataUrl = null;

  // ========== 上传处理 ==========
  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
  });

  // ========== 处理文件 ==========
  function handleFile(file) {
    const validTypes = ['image/jpeg','image/png','image/webp','image/bmp','image/gif','image/tiff','image/svg+xml','image/heic','image/heif'];
    const validExt = /\.(jpe?g|png|webp|bmp|gif|tiff?|svg|heic|heif)$/i.test(file.name);
    if (!file.type.startsWith('image/') && !validExt) {
      alert('请选择图片文件，支持 JPG、PNG、WebP、BMP、GIF、TIFF、SVG、HEIC 等格式');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('图片大小不能超过 50MB');
      return;
    }

    originalFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      originalDataUrl = e.target.result;
      originalPreview.src = originalDataUrl;
      originalInfo.textContent = `📄 ${file.name} | ${formatFileSize(file.size)}`;

      // 加载图片后进行压缩
      const img = new Image();
      img.onload = () => {
        originalInfo.textContent += ` | ${img.width} × ${img.height}`;
        compressImage(img);
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);

    uploadArea.style.display = 'none';
    controlPanel.style.display = 'block';
  }

  // ========== 压缩图片 ==========
  function compressImage(img) {
    const quality = qualitySlider.value / 100;
    const format = formatSelect.value;

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // 如果是 JPEG，设置白色背景防止透明变黑
    if (format === 'image/jpeg') {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      const tmpCtx = tmpCanvas.getContext('2d');
      tmpCtx.fillStyle = '#ffffff';
      tmpCtx.fillRect(0, 0, img.width, img.height);
      tmpCtx.drawImage(canvas, 0, 0);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(tmpCanvas, 0, 0);
    }

    canvas.toBlob((blob) => {
      compressedBlob = blob;
      compressedDataUrl = URL.createObjectURL(blob);
      compressedPreview.src = compressedDataUrl;

      const ratio = ((1 - blob.size / originalFile.size) * 100).toFixed(1);
      compressedInfo.innerHTML = `
        📦 ${formatFileSize(blob.size)} (缩小了 ${ratio}%)
        <span style="display:block;font-size:0.8rem;color:var(--text-muted);">
          ${img.width} × ${img.height}
        </span>
      `;
    }, format, quality);
  }

  // ========== 质量滑块 ==========
  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value + '%';
    if (originalPreview.src && originalPreview.src !== window.location.href) {
      const img = new Image();
      img.src = originalDataUrl;
      img.onload = () => compressImage(img);
    }
  });

  // ========== 格式切换 ==========
  formatSelect.addEventListener('change', () => {
    if (originalPreview.src && originalPreview.src !== window.location.href) {
      const img = new Image();
      img.src = originalDataUrl;
      img.onload = () => compressImage(img);
    }
  });

  // ========== 下载 ==========
  downloadBtn.addEventListener('click', () => {
    if (!compressedBlob) return;
    const ext = formatSelect.value.split('/')[1];
    const name = originalFile.name.replace(/\.[^.]+$/, '') + '_compressed.' + ext;
    downloadBlob(compressedBlob, name);
  });

  // ========== 重置 ==========
  resetBtn.addEventListener('click', () => {
    uploadArea.style.display = '';
    controlPanel.style.display = 'none';
    fileInput.value = '';
    originalPreview.src = '';
    compressedPreview.src = '';
    originalInfo.textContent = '';
    compressedInfo.textContent = '';
    originalFile = null;
    compressedBlob = null;
  });
})();
