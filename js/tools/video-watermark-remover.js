/* ============================================
   视频去水印工具
   浏览器端 Canvas 逐帧处理
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

  // ========== 上传 ==========
  upload.addEventListener('click', () => fileInput.click());
  upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.classList.add('dragover'); });
  upload.addEventListener('dragleave', () => upload.classList.remove('dragover'));
  upload.addEventListener('drop', (e) => {
    e.preventDefault(); upload.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleFile(fileInput.files[0]); });

  function handleFile(file) {
    if (!file.type.startsWith('video/')) { alert('请选择视频文件'); return; }
    if (file.size > 200 * 1024 * 1024) { alert('视频不能超过 200MB'); return; }
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
      // 默认水印区域：右上角 20% 区域
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      rect = { x: vw * 0.65, y: 0, w: vw * 0.35, h: vh * 0.15 };
      updateOverlayPos();
      hint.textContent = '🎯 拖动红色框调整水印区域，或点视频重置位置';
    });
  }

  // ========== 水印区域选择（鼠标绘制） ==========
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
        // 太小了，用默认区域
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        rect = { x: vw * 0.65, y: 0, w: vw * 0.35, h: vh * 0.15 };
        updateOverlayPos();
      }
    }
  });

  // ========== 拖动水印框 ==========
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
      // 最小尺寸
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

  // ========== 核心处理函数 ==========
  function getMethod() {
    for (const r of methodRadios) if (r.checked) return r.value;
    return 'blur';
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
      // 马赛克
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
      // 纯色遮盖
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 200; data[i + 1] = 200; data[i + 2] = 200;
      }
    } else {
      // 模糊 (box blur)
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

  // ========== 预览效果 ==========
  previewBtn.addEventListener('click', () => {
    if (!videoReady) return;
    video.pause();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    processFrame(ctx, canvas.width, canvas.height);
    // 在弹窗或新窗口中显示
    const dataUrl = canvas.toDataURL('image/png');
    const w = window.open('', '预览', 'width=800,height=600');
    w.document.write(`<img src="${dataUrl}" style="max-width:100%"><p style="font-family:sans-serif;color:#666;text-align:center;">单帧预览效果 | 关闭窗口继续</p>`);
  });

  // ========== 全视频处理导出 ==========
  let cancelProcessing = false;

  processBtn.addEventListener('click', async () => {
    if (!videoReady || recording) return;
    video.pause();

    cancelProcessing = false;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const fps = 30;
    const totalFrames = Math.ceil(video.duration * fps);

    // 设置 canvas
    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');

    // 设置 MediaRecorder
    const stream = canvas.captureStream(fps);
    const mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      alert('您的浏览器不支持视频导出，请使用 Chrome 或 Edge');
      return;
    }

    const chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      processedBlob = new Blob(chunks, { type: 'video/webm' });
      exportBtn.disabled = false;
      progress.style.display = 'none';
      exportInfo.textContent = `✅ 处理完成！视频大小: ${formatFileSize(processedBlob.size)}，点击"导出视频"下载`;
      recording = false;
      processBtn.textContent = '✨ 开始处理';
    };

    progress.style.display = 'block';
    progressBar.style.width = '0%';
    exportInfo.textContent = '正在处理视频帧...';
    processBtn.textContent = '⏳ 处理中...';
    recording = true;
    mediaRecorder.start();

    // 逐帧处理
    video.currentTime = 0;
    video.play();

    await new Promise((resolve) => {
      let frameIdx = 0;
      const seekAhead = 3; // 预读帧数

      video.onseeked = async () => {
        if (cancelProcessing || frameIdx >= totalFrames) {
          video.pause();
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          resolve();
          return;
        }

        ctx.drawImage(video, 0, 0);
        processFrame(ctx, vw, vh);

        frameIdx++;
        const pct = Math.round((frameIdx / totalFrames) * 100);
        progressBar.style.width = pct + '%';
        exportInfo.textContent = `处理中... ${frameIdx}/${totalFrames} 帧 (${pct}%)`;

        // 跳到下一帧
        const nextTime = frameIdx / fps;
        if (nextTime < video.duration) {
          video.currentTime = nextTime;
        } else {
          // 等待 recorder 完成
          setTimeout(() => {
            video.pause();
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            resolve();
          }, 500);
        }
      };

      // 开始第一帧
      video.currentTime = 0;
    });
  });

  // ========== 导出 ==========
  exportBtn.addEventListener('click', () => {
    if (!processedBlob) return;
    const name = selectedFile.name.replace(/\.[^.]+$/, '') + '_无水印.webm';
    downloadBlob(processedBlob, name);
  });

  // ========== 重置 ==========
  resetBtn.addEventListener('click', () => {
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
    processBtn.textContent = '✨ 开始处理';
  });

  // ========== 窗口缩放时更新覆盖层 ==========
  window.addEventListener('resize', () => { if (videoReady) updateOverlayPos(); });
})();
