/* ============================================
   PDF ⇄ Word 互转工具
   PDF→Word: PDF.js 解析 + docx 生成
   Word→PDF: mammoth.js 解析 + 浏览器打印
   ============================================ */
(function() {
  // ========== Tab 切换 ==========
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      document.getElementById('tab-' + this.dataset.tab).style.display = '';
    });
  });

  // ==================== PDF → Word ====================
  const pdfUpload = document.getElementById('pdfUpload');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const pdfPanel = document.getElementById('pdfPanel');
  const pdfFileName = document.getElementById('pdfFileName');
  const pdfFileInfo = document.getElementById('pdfFileInfo');
  const pdfProgress = document.getElementById('pdfProgress');
  const pdfProgressText = document.getElementById('pdfProgressText');
  const pdfProgressPercent = document.getElementById('pdfProgressPercent');
  const pdfProgressBar = document.getElementById('pdfProgressBar');
  const pdfTextResult = document.getElementById('pdfTextResult');
  const totalChars = document.getElementById('totalChars');
  const pdf2wordBtn = document.getElementById('pdf2wordBtn');
  const pdfResetBtn = document.getElementById('pdfResetBtn');
  const downloadWordBtn = document.getElementById('downloadWordBtn');
  const downloadTxtBtn = document.getElementById('downloadTxtBtn');
  const copyPdfTextBtn = document.getElementById('copyPdfTextBtn');
  const pdfPagesPreview = document.getElementById('pdfPagesPreview');
  const toolStatus = document.getElementById('toolStatus');

  let pdfDoc = null, pdfDocFileName = '', isPdfConverting = false;

  pdfUpload.addEventListener('click', () => pdfFileInput.click());
  pdfUpload.addEventListener('dragover', e => { e.preventDefault(); pdfUpload.classList.add('dragover'); });
  pdfUpload.addEventListener('dragleave', () => pdfUpload.classList.remove('dragover'));
  pdfUpload.addEventListener('drop', e => { e.preventDefault(); pdfUpload.classList.remove('dragover'); if(e.dataTransfer.files[0]) loadPdf(e.dataTransfer.files[0]); });
  pdfFileInput.addEventListener('change', () => { if(pdfFileInput.files[0]) loadPdf(pdfFileInput.files[0]); });

  async function loadPdf(file) {
    if(!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) { alert('请选择 PDF 文件'); return; }
    if(file.size > 50*1024*1024) { alert('文件不能超过 50MB'); return; }
    pdfDocFileName = file.name; pdfFileName.textContent = file.name;
    pdfFileInfo.textContent = '大小: ' + formatFileSize(file.size);
    toolStatus.textContent = '📄 解析中...';
    pdfUpload.style.display = 'none'; pdfPanel.style.display = 'block';
    pdfProgress.style.display = 'block'; pdfProgressBar.style.width = '0%'; pdfTextResult.value = '';
    pdfPagesPreview.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;">解析中...</div>';

    try {
      const buf = await file.arrayBuffer();
      pdfDoc = await pdfjsLib.getDocument({data:buf}).promise;
      const n = pdfDoc.numPages;
      pdfFileInfo.textContent = `页数: ${n} 页 | 大小: ${formatFileSize(file.size)}`;

      let text = '';
      for(let i=1;i<=n;i++){
        const page = await pdfDoc.getPage(i);
        const items = (await page.getTextContent()).items.map(it=>it.str);
        text += '--- 第 '+i+' 页 ---\n'+items.join(' ')+'\n\n';
        const pct = Math.round(i/n*100);
        pdfProgressBar.style.width = pct+'%'; pdfProgressPercent.textContent = pct+'%';
        pdfProgressText.textContent = '提取第 '+i+'/'+n+' 页...';
      }
      pdfTextResult.value = text.trim();
      totalChars.textContent = text.length+' 字符 | '+text.split('\n').length+' 行';
      renderPdfThumbs();
      pdfProgressText.textContent = '✅ 完成！'; pdfProgressBar.style.width = '100%';
      setTimeout(()=>pdfProgress.style.display='none',1500);
    } catch(err) {
      pdfTextResult.value = '❌ 解析失败: '+err.message;
      pdfProgressText.textContent = '❌ 失败';
    }
  }

  async function renderPdfThumbs() {
    if(!pdfDoc) return;
    pdfPagesPreview.innerHTML = '';
    const max = Math.min(pdfDoc.numPages, 10);
    for(let i=1;i<=max;i++){
      try {
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({scale:0.3});
        const c = document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
        await page.render({canvasContext:c.getContext('2d'), viewport:vp}).promise;
        const w = document.createElement('div');
        w.style.cssText='display:flex;align-items:center;gap:12px;padding:8px;margin:4px 0;background:var(--bg-card);border-radius:8px;border:1px solid var(--border);';
        w.innerHTML='<canvas width="'+vp.width+'" height="'+vp.height+'" style="width:100px;border-radius:4px;"></canvas><span style="font-size:0.85rem;">第 '+i+' 页</span>';
        w.querySelector('canvas').getContext('2d').drawImage(c,0,0);
        pdfPagesPreview.appendChild(w);
      } catch(e){}
    }
    if(pdfDoc.numPages>10) {
      const m = document.createElement('div'); m.style.cssText='text-align:center;padding:8px;color:var(--text-muted);';
      m.textContent = '...还有 '+(pdfDoc.numPages-10)+' 页未预览'; pdfPagesPreview.appendChild(m);
    }
  }

  async function pdf2word() {
    if(!pdfDoc||isPdfConverting) return;
    const text = pdfTextResult.value.trim();
    if(!text) { alert('没有文本内容'); return; }
    if(typeof docx==='undefined') { alert('docx 库未加载，请刷新重试'); return; }
    isPdfConverting = true; pdf2wordBtn.disabled=true; pdf2wordBtn.innerHTML='<span class="spinner"></span> 生成中...';

    try {
      const {Document,Packer,Paragraph,TextRun,Header,Footer,AlignmentType,PageNumber} = docx;
      const paras = [];
      text.split('\n').forEach(line => {
        if(line.startsWith('--- 第') && line.endsWith('页 ---')) {
          paras.push(new Paragraph({children:[new TextRun({text:line,bold:true,size:28,color:'4F46E5'})],spacing:{before:400,after:200},alignment:AlignmentType.CENTER}));
        } else if(line.trim()==='') {
          paras.push(new Paragraph({spacing:{after:100},children:[]}));
        } else {
          paras.push(new Paragraph({children:[new TextRun({text:line,size:22})],spacing:{after:120},indent:{firstLine:400}}));
        }
      });
      const doc = new Document({
        title: pdfDocFileName.replace('.pdf',''),
        styles:{default:{document:{run:{font:'Microsoft YaHei'},paragraph:{spacing:{after:120}}}}},
        sections:[{
          properties:{page:{margin:{top:1440,right:1440,bottom:1440,left:1440}}},
          headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:pdfDocFileName.replace('.pdf',''),size:18,color:'999999'})]})]})},
          footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'第 ',size:18,color:'999999'}),new TextRun({children:[PageNumber.CURRENT],size:18,color:'999999'}),new TextRun({text:' 页',size:18,color:'999999'})]})]})},
          children: paras
        }]
      });
      downloadBlob(await Packer.toBlob(doc), pdfDocFileName.replace(/\.pdf$/i,'')+'.docx');
      toolStatus.textContent = '✅ Word 已下载';
    } catch(err) {
      alert('生成失败: '+err.message);
    } finally {
      isPdfConverting = false; pdf2wordBtn.disabled=false; pdf2wordBtn.innerHTML='🔄 转换为 Word';
    }
  }

  pdfTextResult.addEventListener('input', ()=>{
    const t = pdfTextResult.value;
    totalChars.textContent = t.length+' 字符 | '+t.split('\n').length+' 行';
  });

  downloadWordBtn.addEventListener('click', pdf2word);
  pdf2wordBtn.addEventListener('click', pdf2word);
  downloadTxtBtn.addEventListener('click', ()=>{
    const t = pdfTextResult.value.trim();
    if(!t) return alert('没有内容');
    downloadFile(t, (pdfDocFileName||'pdf').replace('.pdf','')+'.txt', 'text/plain');
  });
  copyPdfTextBtn.addEventListener('click', ()=>{ if(pdfTextResult.value) copyToClipboard(pdfTextResult.value); });
  pdfResetBtn.addEventListener('click', ()=>{
    pdfUpload.style.display=''; pdfPanel.style.display='none'; pdfFileInput.value='';
    pdfDoc=null; pdfTextResult.value=''; pdfPagesPreview.innerHTML=''; pdfProgress.style.display='none';
    toolStatus.textContent = '📄 待上传';
  });

  // ==================== Word → PDF ====================
  const wordUpload = document.getElementById('wordUpload');
  const wordFileInput = document.getElementById('wordFileInput');
  const wordPanel = document.getElementById('wordPanel');
  const wordFileName = document.getElementById('wordFileName');
  const wordFileInfo = document.getElementById('wordFileInfo');
  const wordProgress = document.getElementById('wordProgress');
  const wordProgressBar = document.getElementById('wordProgressBar');
  const wordProgressText = document.getElementById('wordProgressText');
  const wordPreview = document.getElementById('wordPreview');
  const word2pdfBtn = document.getElementById('word2pdfBtn');
  const wordResetBtn = document.getElementById('wordResetBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const printPdfBtn = document.getElementById('printPdfBtn');
  const printArea = document.getElementById('printArea');

  let wordHtml = '';
  let wordDocName = '';

  wordUpload.addEventListener('click', ()=>wordFileInput.click());
  wordUpload.addEventListener('dragover', e=>{e.preventDefault();wordUpload.classList.add('dragover');});
  wordUpload.addEventListener('dragleave', ()=>wordUpload.classList.remove('dragover'));
  wordUpload.addEventListener('drop', e=>{e.preventDefault();wordUpload.classList.remove('dragover');if(e.dataTransfer.files[0])loadWord(e.dataTransfer.files[0]);});
  wordFileInput.addEventListener('change', ()=>{if(wordFileInput.files[0])loadWord(wordFileInput.files[0]);});

  async function loadWord(file) {
    if(!file.name.toLowerCase().endsWith('.docx') && file.type!=='application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      alert('请选择 .docx 文件'); return;
    }
    if(file.size > 20*1024*1024) { alert('文件不能超过 20MB'); return; }
    wordDocName = file.name;
    wordFileName.textContent = file.name;
    wordFileInfo.textContent = '大小: ' + formatFileSize(file.size);
    toolStatus.textContent = '📝 解析中...';
    wordUpload.style.display = 'none'; wordPanel.style.display = 'block';
    wordProgress.style.display = 'block'; wordProgressBar.style.width = '10%';
    wordProgressText.textContent = '解析 Word 文档...';
    wordPreview.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:40px;">解析中...</div>';

    try {
      const buf = await file.arrayBuffer();
      wordProgressBar.style.width = '50%';
      const result = await mammoth.convertToHtml({arrayBuffer: buf});
      wordHtml = result.value;
      wordProgressBar.style.width = '100%';
      wordProgressText.textContent = '✅ 解析完成！';
      wordPreview.innerHTML = wordHtml;
      wordFileInfo.textContent = '大小: '+formatFileSize(file.size)+' | 点击下方按钮导出 PDF';
      wordProgress.style.display = 'none';
    } catch(err) {
      wordPreview.innerHTML = '❌ 解析失败: '+err.message;
      wordProgressText.textContent = '❌ 失败';
    }
  }

  function exportAsPdf() {
    if(!wordHtml) { alert('请先上传 Word 文件'); return; }
    printArea.innerHTML = wordHtml;
    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      body { font-family: "Microsoft YaHei","PingFang SC",sans-serif; line-height:1.8; color:#333; }
      h1,h2,h3,h4,h5,h6 { margin-top:1em; margin-bottom:0.5em; }
      table { border-collapse:collapse; width:100%; margin:1em 0; }
      td,th { border:1px solid #ddd; padding:8px; }
      img { max-width:100%; }
      p { margin:0.5em 0; }
    `;
    printArea.appendChild(style);
    window.print();
  }

  word2pdfBtn.addEventListener('click', exportAsPdf);
  downloadPdfBtn.addEventListener('click', exportAsPdf);
  printPdfBtn.addEventListener('click', exportAsPdf);

  wordResetBtn.addEventListener('click', ()=>{
    wordUpload.style.display=''; wordPanel.style.display='none'; wordFileInput.value='';
    wordHtml=''; wordPreview.innerHTML=''; wordProgress.style.display='none';
    toolStatus.textContent = '📄 待上传';
  });
})();
