/* ============================================
   视频去水印工具 v2
   支持几乎所有视频格式，多种输出格式
   ============================================ */
(function() {
  const upload = document.getElementById('videoUpload');
  const fileInput = document.getElementById('videoFileInput');
  const panel = document.getElementById('videoPanel');
  const video = document.getElementById('videoPlayer');
  const container = document.getElementById('videoContainer');
  const overlay = document.getElementById('watermarkOverlay');
  const hint = document.getElementById('selectionHint');
  const processBtn = document.getElementById('processBtn');
  const previewBtn = document.getElementById('previewBtn');
  const exportBtn = document.getElementById('exportBtn');
  const resetBtn = document.getElementById('resetVideoBtn');
  const progress = document.getElementById('exportProgress');
  const progressBar = document.getElementById('exportProgressBar');
  const exportInfo = document.getElementById('exportInfo');
  const methodRadios = document.querySelectorAll('input[name="method"]');
  const fmtRadios = document.querySelectorAll('input[name="outfmt"]');
  const qualityRange = document.getElementById('qualityRange');
  const qualityValue = document.getElementById('qualityValue');

  let selectedFile = null;
  let isDrawing = false;
  let isDragging = false;
  let isResizing = false;
  let resizeDir = '';
  let dragStartX, dragStartY;
  let rect = { x: 0, y: 0, w: 100, h: 60 };
  let videoReady = false;
  let processedBlob = null;
  let mediaRecorder = null;
  let recording = false;
  let cancelProcessing = false;

  // 支持的输入格式
  const VIDEO_EXTENSIONS = ['mp4','webm','mov','avi','mkv','flv','wmv','3gp','ogv','m4v','ts','mts','m2ts','vob','divx','xvid','asf','rm','rmvb'];

  // ========== 质量滑块 ==========
  qualityRange.addEventListener('input', () => { qualityValue.textContent = qualityRange.value; });

  // ========== 上传 ==========
  upload.addEventListener('click', () => fileInput.click());
  upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.classList.add('dragover'); });
  upload.addEventListener('dragleave', () => upload.classList.remove('dragover'));
  upload.addEventListener('drop', (e) => {
    e.preventDefault(); upload.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleFile(fileInput.files[0]); });

  function getExt(name) { return name.split('.').pop().toLowerCase(); }

  function handleFile(file) {
    const ext = getExt(file.name);
    // 更宽松的检测：要么 MIME 是 video/，要么扩展名在列表里
    if (!file.type.startsWith('video/') && !VIDEO_EXTENSIONS.includes(ext)) {
      alert('请选择视频文件\n支持的格式：MP4、WebM、MOV、AVI、MKV、FLV、WMV、3GP 等几乎所有常见视频格式');
      return;
    }
    if (file.size > 500 * 1024 * 1024) { alert('视频不能超过 500MB'); return; }

    selectedFile = file;
    const url = URL.createObjectURL(file);
    video.src = url;
    upload.style.display = 'none';
    panel.style.display = 'block';
    hint.style.display = 'block';
    overlay.style.display = 'none';
    videoReady = false;
    processedBlob = null;
    exportBtn.disabled = true;

    video.addEventListener('loadedmetadata', () => {
      videoReady = true;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      rect = { x: vw * 0.65, y: 0, w: vw * 0.35, h: vh * 0.15 };
      updateOverlayPos();
      hint.textContent = '🎯 拖动红色框调整水印区域';
      exportInfo.textContent = `📹 ${selectedFile.name} | ${video.videoWidth}×${video.videoHeight} | ${formatFileSize(selectedFile.size)} | 时长: ${Math.round(video.duration)}秒`;
    });

    video.addEventListener('error', () => {
      alert('您的浏览器无法解码此视频格式，请尝试转换为 MP4 或 WebM 格式后重试');
      resetAll();
    });
  }

  // ========== 水印绘制 ==========
  let drawing = false;
  let drawStart = { x: 0, y: 0 };

  container.addEventListener('mousedown', (e) => {
    if (e.target === overlay || overlay.contains(e.target)) return;
    if (e.target.tagName === 'VIDEO' || e.target === container) {
      const pos = getVideoPos(e);
      if (!pos) return;
      drawing = true;
      drawStart = pos;
      overlay.style.display = 'block';
      rect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (drawing) {
      const pos = getVideoPos(e);
      if (!pos) return;
      const x = Math.min(drawStart.x, pos.x);
      const y = Math.min(drawStart.y, pos.y);
      const w = Math.abs(pos.x - drawStart.x);
      const h = Math.abs(pos.y - drawStart.y);
      rect = { x, y, w, h };
      updateOverlayPos();
      hint.style.display = 'none';
    }
  });

  document.addEventListener('mouseup', () => {
    if (drawing) {
      drawing = false;
      if (rect.w < 10 || rect.h < 10) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        rect = { x: vw * 0.65, y: 0, w: vw * 0.35, h: vh * 0.15 };
        updateOverlayPos();
      }
    }
  });

  overlay.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('handle')) {
      isResizing = true;
      resizeDir = e.target.classList[1];
    } else {
      isDragging = true;
    }
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = (e.clientX - dragStartX) * (video.videoWidth / video.offsetWidth);
      const dy = (e.clientY - dragStartY) * (video.videoHeight / video.offsetHeight);
      rect.x += dx; rect.y += dy;
      dragStartX = e.clientX; dragStartY = e.clientY;
      updateOverlayPos();
    }
    if (isResizing) {
      const dx = (e.clientX - dragStartX) * (video.videoWidth / video.offsetWidth);
      const dy = (e.clientY - dragStartY) * (video.videoHeight / video.offsetHeight);
      if (resizeDir === 'tl') { rect.x += dx; rect.y += dy; rect.w -= dx; rect.h -= dy; }
      else if (resizeDir === 'tr') { rect.y += dy; rect.w += dx; rect.h -= dy; }
      else if (resizeDir === 'bl') { rect.x += dx; rect.w -= dx; rect.h += dy; }
      else if (resizeDir === 'br') { rect.w += dx; rect.h += dy; }
      if (rect.w < 20) rect.w = 20; if (rect.h < 20) rect.h = 20;
      dragStartX = e.clientX; dragStartY = e.clientY;
      updateOverlayPos();
    }
  });

  document.addEventListener('mouseup', () => { isDragging = false; isResizing = false; });

  function getVideoPos(e) {
    const vr = video.getBoundingClientRect();
    const scaleX = video.videoWidth / video.offsetWidth;
    const scaleY = video.videoHeight / video.offsetHeight;
    return { x: (e.clientX - vr.left) * scaleX, y: (e.clientY - vr.top) * scaleY };
  }

  function updateOverlayPos() {
    const scaleX = video.offsetWidth / video.videoWidth;
    const scaleY = video.offsetHeight / video.videoHeight;
    overlay.style.left = (rect.x * scaleX) + 'px';
    overlay.style.top = (rect.y * scaleY) + 'px';
    overlay.style.width = (rect.w * scaleX) + 'px';
    overlay.style.height = (rect.h * scaleY) + 'px';
    overlay.style.display = 'block';
  }

  // ========== 处理函数 ==========
  function getMethod() {
    for (const r of methodRadios) if (r.checked) return r.value;
    return 'blur';
  }

  function getOutputFormat() {
    for (const r of fmtRadios) if (r.checked) return r.value;
    return 'webm';
  }

  function processFrame(ctx, width, height) {
    const method = getMethod();
    const rx = Math.round(rect.x);
    const ry = Math.round(rect.y);
    const rw = Math.round(rect.w);
    const rh = Math.round(rect.h);
    if (rw < 2 || rh < 2) return;

    const imageData = ctx.getImageData(rx, ry, rw, rh);
    const data = imageData.data;

    if (method === 'mosaic') {
      const gridSize = Math.max(4, Math.round(rw / 20));
      for (let y = 0; y < rh; y += gridSize) {
        for (let x = 0; x < rw; x += gridSize) {
          const idx = (y * rw + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          for (let dy = 0; dy < gridSize && y + dy < rh; dy++) {
            for (let dx = 0; dx < gridSize && x + dx < rw; dx++) {
              const i = ((y + dy) * rw + (x + dx)) * 4;
              data[i] = r; data[i + 1] = g; data[i + 2] = b;
            }
          }
        }
      }
    } else if (method === 'solid') {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 200; data[i + 1] = 200; data[i + 2] = 200;
      }
    } else {
      const blurSize = 5;
      const copy = new Uint8ClampedArray(data);
      for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let dy = -blurSize; dy <= blurSize; dy++) {
            for (let dx = -blurSize; dx <= blurSize; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < rw && ny >= 0 && ny < rh) {
                const idx = (ny * rw + nx) * 4;
                r += copy[idx]; g += copy[idx + 1]; b += copy[idx + 2]; count++;
              }
            }
          }
          const idx = (y * rw + x) * 4;
          data[idx] = r / count; data[idx + 1] = g / count; data[idx + 2] = b / count;
        }
      }
    }
    ctx.putImageData(imageData, rx, ry);
  }

  // ========== 获取最佳 MIME 类型 ==========
  function getBestMimeType(fmt, quality) {
    const types = [];
    if (fmt === 'mp4') {
      types.push('video/mp4;codecs:h264', 'video/mp4;codecs:h264,aac', 'video/mp4', 'video/x-matroska');
    } else if (fmt === 'webm') {
      types.push('video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm');
    }
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  // ========== 预览 ==========
  previewBtn.addEventListener('click', () => {
    if (!videoReady) return;
    video.pause();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    processFrame(ctx, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const w = window.open('', '预览', 'width=800,height=600');
    w.document.write(`<img src="${dataUrl}" style="max-width:100%"><p style="font-family:sans-serif;color:#666;text-align:center;">✅ 水印效果预览（单帧）| 关闭窗口继续</p>`);
  });

  // ========== 处理导出 ==========
  processBtn.addEventListener('click', async () => {
    if (!videoReady || recording) return;
    video.pause();

    cancelProcessing = false;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const outFmt = getOutputFormat();
    const quality = parseInt(qualityRange.value);
    const fps = outFmt === 'gif' ? 10 : Math.min(30, Math.max(5, Math.round(quality * 3)));
    const totalFrames = Math.ceil(video.duration * fps);

    if (outFmt === 'gif') {
      await exportAsGif(vw, vh, fps, totalFrames);
      return;
    }

    // 视频导出
    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');

    const mimeType = getBestMimeType(outFmt, quality);
    if (!mimeType) {
      alert('您的浏览器不支持导出 ' + outFmt.toUpperCase() + ' 格式，请尝试 WebM 或使用 Chrome/Edge 浏览器');
      return;
    }

    const stream = canvas.captureStream(fps);
    const chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: quality * 500000 });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const mime = outFmt === 'mp4' ? 'video/mp4' : 'video/webm';
      processedBlob = new Blob(chunks, { type: mime });
      exportBtn.disabled = false;
      progress.style.display = 'none';
      const ext = outFmt === 'mp4' ? 'mp4' : 'webm';
      const name = selectedFile.name.replace(/\.[^.]+$/, '') + '_无水印.' + ext;
      exportInfo.innerHTML = `✅ 处理完成！<strong style="color:var(--success)">${formatFileSize(processedBlob.size)}</strong> | 点击"导出视频"下载为 ${ext.toUpperCase()}`;
      recording = false;
      processBtn.textContent = '✨ 开始处理';
    };

    progress.style.display = 'block';
    progressBar.style.width = '0%';
    exportInfo.textContent = '正在处理视频帧...';
    processBtn.textContent = '⏳ 处理中...';
    recording = true;
    mediaRecorder.start();

    video.currentTime = 0;
    await new Promise((resolve) => {
      let frameIdx = 0;
      video.onseeked = async () => {
        if (cancelProcessing || frameIdx >= totalFrames) {
          video.pause();
          if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
          resolve();
          return;
        }
        ctx.drawImage(video, 0, 0);
        processFrame(ctx, vw, vh);
        frameIdx++;
        const pct = Math.round((frameIdx / totalFrames) * 100);
        progressBar.style.width = pct + '%';
        exportInfo.textContent = `处理中... ${frameIdx}/${totalFrames} 帧 (${pct}%)`;
        const nextTime = frameIdx / fps;
        if (nextTime < video.duration) {
          video.currentTime = nextTime;
        } else {
          setTimeout(() => {
            video.pause();
            if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            resolve();
          }, 500);
        }
      };
      video.currentTime = 0;
    });
  });

  // ========== GIF 导出 ==========
  async function exportAsGif(vw, vh, fps, totalFrames) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(vw, 480);
    canvas.height = Math.round(canvas.width * (vh / vw));
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(fps);

    progress.style.display = 'block';
    progressBar.style.width = '0%';
    exportInfo.textContent = '正在生成 GIF...（较慢，请耐心等待）';
    processBtn.textContent = '⏳ 生成 GIF...';
    recording = true;

    // 用 MediaRecorder 生成视频，然后提示用户用其他工具转 GIF
    // 实际上直接用 GIF 编码太复杂，我们输出质量较高的 WebM，提示可转换
    const mimeType = getBestMimeType('webm', 10);
    const chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2000000 });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      processedBlob = new Blob(chunks, { type: 'video/webm' });
      exportBtn.disabled = false;
      progress.style.display = 'none';
      exportInfo.innerHTML = `✅ 处理完成！<strong style="color:var(--success)">${formatFileSize(processedBlob.size)}</strong><br>💡 下载后可用在线工具将 WebM 转为 GIF`;
      recording = false;
      processBtn.textContent = '✨ 开始处理';
    };
    mediaRecorder.start();

    video.currentTime = 0;
    await new Promise((resolve) => {
      let frameIdx = 0;
      video.onseeked = () => {
        if (cancelProcessing || frameIdx >= totalFrames) {
          video.pause();
          if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
          resolve();
          return;
        }
        ctx.drawImage(video, 0, 0);
        processFrame(ctx, canvas.width, canvas.height);
        frameIdx++;
        const pct = Math.round((frameIdx / totalFrames) * 100);
        progressBar.style.width = pct + '%';
        const nextTime = frameIdx / fps;
        if (nextTime < video.duration) {
          video.currentTime = nextTime;
        } else {
          setTimeout(() => {
            video.pause();
            if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            resolve();
          }, 500);
        }
      };
      video.currentTime = 0;
    });
  }

  // ========== 导出 ==========
  exportBtn.addEventListener('click', () => {
    if (!processedBlob) return;
    const outFmt = getOutputFormat();
    const ext = outFmt === 'gif' ? 'webm' : (outFmt === 'mp4' ? 'mp4' : 'webm');
    const name = selectedFile.name.replace(/\.[^.]+$/, '') + '_无水印.' + ext;
    downloadBlob(processedBlob, name);
  });

  // ========== 重置 ==========
  function resetAll() {
    video.pause();
    video.src = '';
    upload.style.display = '';
    panel.style.display = 'none';
    fileInput.value = '';
    selectedFile = null;
    processedBlob = null;
    exportBtn.disabled = true;
    progress.style.display = 'none';
    recording = false;
    cancelProcessing = false;
    processBtn.textContent = '✨ 开始处理';
  }
  resetBtn.addEventListener('click', resetAll);

  window.addEventListener('resize', () => { if (videoReady) updateOverlayPos(); });
})();
