(function() {
  const tabs = document.querySelectorAll('.tab');
  const encodeInput = document.getElementById('encodeInput');
  const encodeOutput = document.getElementById('encodeOutput');
  const decodeInput = document.getElementById('decodeInput');
  const decodeOutput = document.getElementById('decodeOutput');
  const encodeBtn = document.getElementById('encodeBtn');
  const decodeBtn = document.getElementById('decodeBtn');
  const copyEncodeBtn = document.getElementById('copyEncodeBtn');
  const copyDecodeBtn = document.getElementById('copyDecodeBtn');

  tabs.forEach(tab => tab.addEventListener('click', function() {
    tabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + this.dataset.tab).style.display = '';
  }));

  encodeBtn.addEventListener('click', () => {
    try { encodeOutput.value = btoa(unescape(encodeURIComponent(encodeInput.value))); }
    catch(e) { encodeOutput.value = '编码失败: ' + e.message; }
  });

  decodeBtn.addEventListener('click', () => {
    try { decodeOutput.value = decodeURIComponent(escape(atob(decodeInput.value.trim()))); }
    catch(e) { decodeOutput.value = '解码失败: 请确保输入有效的 Base64 字符串'; }
  });

  copyEncodeBtn.addEventListener('click', () => { if(encodeOutput.value) copyToClipboard(encodeOutput.value); });
  copyDecodeBtn.addEventListener('click', () => { if(decodeOutput.value) copyToClipboard(decodeOutput.value); });

  // 图片转 Base64
  const upload = document.getElementById('b64Upload');
  const fileInput = document.getElementById('b64FileInput');
  const imgOutput = document.getElementById('imageBase64Output');
  const copyImgBtn = document.getElementById('copyImage64Btn');

  upload.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => imgOutput.value = e.target.result;
    reader.readAsDataURL(file);
  });
  copyImgBtn.addEventListener('click', () => { if(imgOutput.value) copyToClipboard(imgOutput.value); });

  // 快捷编码（实时）
  encodeInput.addEventListener('input', () => {
    try { encodeOutput.value = btoa(unescape(encodeURIComponent(encodeInput.value))); }
    catch(e) { /* 不自动处理错误 */ }
  });
})();
