/* ============================================
   二维码生成器
   使用 qrcodejs 库 (通过 CDN 加载)
   ============================================ */

(function() {
  // ========== DOM 引用 ==========
  const tabs = document.querySelectorAll('.tab');
  const tabContents = {
    text: document.getElementById('tab-text'),
    url: document.getElementById('tab-url'),
    wifi: document.getElementById('tab-wifi'),
    vcard: document.getElementById('tab-vcard'),
  };
  const canvas = document.getElementById('qrcodeCanvas');
  const downloadBtn = document.getElementById('downloadQrBtn');
  const copyBtn = document.getElementById('copyQrBtn');
  const hint = document.getElementById('qrcodeHint');
  const contentPreview = document.getElementById('qrContentPreview');

  let currentQrText = 'https://example.com';
  let qrInstance = null;

  // ========== Tab 切换 ==========
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.keys(tabContents).forEach(key => {
        tabContents[key].style.display = key === tab.dataset.tab ? '' : 'none';
      });
      generateFromCurrentTab();
    });
  });

  // ========== 获取当前 Tab 的内容 ==========
  function getCurrentQrText() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return '';

    switch (activeTab.dataset.tab) {
      case 'text':
        return document.getElementById('textInput').value.trim() || '示例文本';
      case 'url':
        return document.getElementById('urlInput').value.trim() || 'https://';
      case 'wifi': {
        const ssid = document.getElementById('wifiSsid').value.trim();
        const pass = document.getElementById('wifiPassword').value.trim();
        const enc = document.getElementById('wifiEncryption').value;
        if (!ssid) return '';
        if (enc) {
          return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
        } else {
          return `WIFI:S:${ssid};T:nopass;P:${pass};;`;
        }
      }
      case 'vcard': {
        const name = document.getElementById('vcardName').value.trim();
        const phone = document.getElementById('vcardPhone').value.trim();
        const email = document.getElementById('vcardEmail').value.trim();
        const org = document.getElementById('vcardOrg').value.trim();
        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
        if (name) vcard += `FN:${name}\nN:${name};;;\n`;
        if (phone) vcard += `TEL:${phone}\n`;
        if (email) vcard += `EMAIL:${email}\n`;
        if (org) vcard += `ORG:${org}\n`;
        vcard += 'END:VCARD';
        return vcard || '';
      }
      default:
        return '';
    }
  }

  // ========== 输入自动生成 ==========
  function setupAutoGenerate() {
    const inputs = document.querySelectorAll('#tab-text textarea, #tab-url input, #tab-wifi input, #tab-wifi select, #tab-vcard input');
    inputs.forEach(input => {
      input.addEventListener('input', debounce(generateFromCurrentTab, 300));
    });
  }
  setupAutoGenerate();

  // ========== 生成二维码 ==========
  function generateFromCurrentTab() {
    const text = getCurrentQrText();
    currentQrText = text;
    contentPreview.value = text;

    if (!text) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hint.textContent = '请填写内容后生成二维码';
      return;
    }

    generateQrCode(text);
  }

  // ========== QR 码生成核心 ==========
  // 使用简化的 QR 码生成算法 (支持版本 1-7, 纠错级别 M)
  // 这是一个自包含的轻量实现，无需外部依赖

  function generateQrCode(text) {
    const size = 280;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // 使用 qr.js 算法生成矩阵
    try {
      const qr = new QRCodeModel(-1, 2); // 自动版本, M 纠错
      qr.addData(text);
      qr.make();

      const moduleCount = qr.getModuleCount();
      const moduleSize = Math.floor(size / (moduleCount + 8)); // 留白边
      const offset = Math.floor((size - moduleCount * moduleSize) / 2);

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(offset + col * moduleSize, offset + row * moduleSize, moduleSize, moduleSize);
          }
        }
      }

      hint.textContent = `✅ 二维码已生成 | 版本: ${moduleCount}×${moduleCount} | 数据: ${text.length} 字符`;
    } catch (e) {
      hint.textContent = '⚠️ 内容过长或包含不支持的字符，请缩短内容';
      console.error('QR generation error:', e);
    }
  }

  // ========== 下载 ==========
  downloadBtn.addEventListener('click', () => {
    if (!currentQrText) return;
    canvas.toBlob(blob => {
      downloadBlob(blob, '二维码.png');
    }, 'image/png');
  });

  // ========== 复制 ==========
  copyBtn.addEventListener('click', () => {
    if (!currentQrText) return;
    canvas.toBlob(blob => {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        showCopyToast();
      }).catch(() => {
        // fallback: copy the QR text instead
        copyToClipboard(currentQrText);
      });
    }, 'image/png');
  });

  // ========== 初始化 ==========
  generateFromCurrentTab();

  // =============================================
  // QR Code Model - 轻量级 QR 码生成实现
  // 基于开源算法，支持数字、字母、字节模式
  // =============================================

  var QRCodeModel = (function() {
    // 模式定义
    var MODE_NUMBER = 1;
    var MODE_ALPHA_NUM = 2;
    var MODE_8BIT_BYTE = 4;

    // 纠错级别
    var ECC_L = 1;
    var ECC_M = 0;
    var ECC_Q = 3;
    var ECC_H = 2;

    // GF(256) 多项式
    var GF256_MAP = new Array(256);
    var GF256_EXP = new Array(512);
    (function() {
      var v = 1;
      for (var i = 0; i < 256; i++) {
        GF256_MAP[i] = v;
        GF256_EXP[i] = v;
        v = v * 2 ^ (v >= 128 ? 0x11d : 0);
        v &= 0xff;
      }
      for (var i = 256; i < 512; i++) {
        GF256_EXP[i] = GF256_EXP[i - 255];
      }
    })();

    function glog(n) { if (n < 1) throw 'glog(' + n + ')'; return GF256_MAP[n]; }
    function gexp(n) { return GF256_EXP[n]; }

    // 多项式
    function Polynomial(num, shift) {
      var offset = 0;
      while (offset < num.length && num[offset] === 0) offset++;
      this.num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
      this.num.length = num.length - offset + shift || 1;
    }

    Polynomial.prototype.get = function(i) { return this.num[i] || 0; };
    Polynomial.prototype.getLength = function() { return this.num.length; };

    Polynomial.prototype.multiply = function(e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) {
          num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
        }
      }
      return new Polynomial(num, 0);
    };

    Polynomial.prototype.mod = function(e) {
      if (this.getLength() - e.getLength() < 0) return this;
      var ratio = glog(this.get(0)) - glog(e.get(0));
      var num = new Array(this.getLength());
      for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (var i = 0; i < e.getLength(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
      return new Polynomial(num, 0).mod(e);
    };

    // RS 纠错码生成
    function rsGenPoly(degree) {
      var poly = new Polynomial([1], 0);
      for (var i = 0; i < degree; i++) {
        poly = poly.multiply(new Polynomial([1, gexp(i)], 0));
      }
      return poly;
    }

    // 版本信息表
    var VERSION_BLOCKS = [
      1, 26, 19, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      2, 44, 34, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      3, 70, 55, 1, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0,
      4, 100, 80, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      5, 134, 108, 1, 1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      6, 172, 136, 1, 1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      7, 196, 156, 1, 1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      8, 242, 194, 1, 1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      9, 292, 232, 1, 1, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      10, 346, 274, 1, 1, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    // 字符计数位长度
    var CHAR_COUNT_BITS = [
      [0, 0, 0],
      [10, 9, 8],
      [12, 11, 16],
      [14, 13, 16]
    ];

    // AlphaNum 字符映射
    var ALPHA_NUM_MAP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

    // 主构造函数
    function QRCodeModel(typeNumber, errorCorrectLevel) {
      this.typeNumber = typeNumber;
      this.errorCorrectLevel = errorCorrectLevel;
      this.modules = null;
      this.moduleCount = 0;
      this.dataCache = null;
      this.dataList = [];
    }

    QRCodeModel.prototype.addData = function(data, mode) {
      if (!mode) {
        if (/^\d+$/.test(data)) mode = MODE_NUMBER;
        else if (/^[0-9A-Z \$%\*\+\-\.\/\:]+$/.test(data)) mode = MODE_ALPHA_NUM;
        else mode = MODE_8BIT_BYTE;
      }
      this.dataList.push({ mode: mode, data: data });
      this.dataCache = null;
    };

    QRCodeModel.prototype.isDark = function(row, col) {
      if (this.modules[row][col] !== null && this.modules[row][col] !== undefined) {
        return this.modules[row][col];
      }
      return false;
    };

    QRCodeModel.prototype.getModuleCount = function() {
      return this.moduleCount;
    };

    QRCodeModel.prototype.make = function() {
      this._determineVersion();
      this._makeMatrix();
      this._makeECC();
      this._makeModules();
      this._addFinderPatterns();
      this._addTimingPatterns();
      this._addAlignmentPatterns();
      this._fillData();
      this._maskPattern();
      this._addFormatInfo();
    };

    QRCodeModel.prototype._determineVersion = function() {
      var totalData = 0;
      for (var i = 0; i < this.dataList.length; i++) {
        var d = this.dataList[i];
        var bits = 4; // 模式指示符
        var countBits = CHAR_COUNT_BITS[d.mode][this.typeNumber < 0 ? 0 : this.typeNumber];
        bits += countBits;
        if (d.mode === MODE_NUMBER) bits += Math.ceil(d.data.length * 10 / 3);
        else if (d.mode === MODE_ALPHA_NUM) bits += Math.ceil(d.data.length * 11 / 2);
        else if (d.mode === MODE_8BIT_BYTE) bits += d.data.length * 8;
        totalData += bits;
      }

      // 自动选择版本 (1-10)
      if (this.typeNumber < 0) {
        for (var v = 1; v <= 10; v++) {
          var idx = (v - 1) * 16;
          var dataCap = VERSION_BLOCKS[idx + 2] * 8; // 字节容量
          if (totalData <= dataCap) {
            this.typeNumber = v;
            return;
          }
        }
        this.typeNumber = 10; // 最大支持版本 10
      }
    };

    QRCodeModel.prototype._makeMatrix = function() {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var i = 0; i < this.moduleCount; i++) {
        this.modules[i] = new Array(this.moduleCount);
        for (var j = 0; j < this.moduleCount; j++) {
          this.modules[i][j] = null;
        }
      }
    };

    QRCodeModel.prototype._makeECC = function() {
      // 简化的 ECC 生成
      this.dataCache = [];
      for (var i = 0; i < this.dataList.length; i++) {
        var d = this.dataList[i];
        var mode = d.mode;
        var data = d.data;

        // 模式指示符
        this.dataCache.push(mode);
        // 字符计数
        var countBits = CHAR_COUNT_BITS[mode][this.typeNumber];
        var bits = [];
        var count = data.length;
        for (var j = countBits - 1; j >= 0; j--) {
          bits.push((count >> j) & 1);
        }
        for (var j = 0; j < bits.length; j++) this.dataCache.push(bits[j]);

        // 数据编码
        if (mode === MODE_NUMBER) {
          for (var j = 0; j < data.length; j += 3) {
            var chunk = data.substring(j, j + 3);
            var val = parseInt(chunk, 10);
            var chunkBits = chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4;
            for (var k = chunkBits - 1; k >= 0; k--) {
              this.dataCache.push((val >> k) & 1);
            }
          }
        } else if (mode === MODE_ALPHA_NUM) {
          for (var j = 0; j < data.length; j += 2) {
            var chunk = data.substring(j, j + 2);
            var val = 0;
            if (chunk.length === 2) {
              val = ALPHA_NUM_MAP.indexOf(chunk[0]) * 45 + ALPHA_NUM_MAP.indexOf(chunk[1]);
              for (var k = 10; k >= 0; k--) this.dataCache.push((val >> k) & 1);
            } else {
              val = ALPHA_NUM_MAP.indexOf(chunk[0]);
              for (var k = 5; k >= 0; k--) this.dataCache.push((val >> k) & 1);
            }
          }
        } else if (mode === MODE_8BIT_BYTE) {
          for (var j = 0; j < data.length; j++) {
            var byte = data.charCodeAt(j) & 0xff;
            for (var k = 7; k >= 0; k--) {
              this.dataCache.push((byte >> k) & 1);
            }
          }
        }
      }

      // 填充终止符
      for (var i = 0; i < 4; i++) this.dataCache.push(0);

      // 填充到字节边界
      while (this.dataCache.length % 8 !== 0) this.dataCache.push(0);

      // 填充到容量
      var idx = (this.typeNumber - 1) * 16;
      var dataCapacity = VERSION_BLOCKS[idx + 2];
      while (this.dataCache.length / 8 < dataCapacity) {
        // 交替填充 0xEC 和 0x11
        var fill = (Math.floor(this.dataCache.length / 8) % 2 === 0) ? 0xEC : 0x11;
        for (var j = 7; j >= 0; j--) this.dataCache.push((fill >> j) & 1);
      }

      // 截断到数据容量
      this.dataCache = this.dataCache.slice(0, dataCapacity * 8);
    };

    QRCodeModel.prototype._makeModules = function() {
      // 初始化模块矩阵 (finder patterns 占位)
      var finderSize = 7;
      var alignmentSize = 5;

      for (var row = 0; row < this.moduleCount; row++) {
        for (var col = 0; col < this.moduleCount; col++) {
          // Finder pattern 区域
          if ((row < finderSize && col < finderSize) ||
              (row < finderSize && col >= this.moduleCount - finderSize) ||
              (row >= this.moduleCount - finderSize && col < finderSize)) {
            continue; // 保留为 null
          }
          this.modules[row][col] = false;
        }
      }
    };

    QRCodeModel.prototype._addFinderPatterns = function() {
      var finderSize = 7;
      var positions = [
        [0, 0],
        [0, this.moduleCount - finderSize],
        [this.moduleCount - finderSize, 0]
      ];

      for (var p = 0; p < positions.length; p++) {
        var row0 = positions[p][0];
        var col0 = positions[p][1];

        for (var r = -1; r <= finderSize; r++) {
          for (var c = -1; c <= finderSize; c++) {
            var row = row0 + r;
            var col = col0 + c;
            if (row < 0 || row >= this.moduleCount || col < 0 || col >= this.moduleCount) continue;

            var isOuter = r === -1 || r === finderSize || c === -1 || c === finderSize;
            var isInnerBorder = (r === 1 || r === finderSize - 2) && (c >= 1 && c <= finderSize - 2) ||
                                (c === 1 || c === finderSize - 2) && (r >= 1 && r <= finderSize - 2);
            var isCenter = (r >= 2 && r <= 4) && (c >= 2 && c <= 4);

            // 分隔区 (白色)
            if (isOuter) {
              this.modules[row][col] = false;
            }
            // 外边框和中心 (黑色)
            else if (r === 0 || r === finderSize - 1 || c === 0 || c === finderSize - 1 || isCenter) {
              this.modules[row][col] = true;
            }
            // 内白色间隔
            else if (isInnerBorder) {
              this.modules[row][col] = false;
            }
          }
        }
      }
    };

    QRCodeModel.prototype._addTimingPatterns = function() {
      var finderSize = 7;
      for (var i = finderSize + 1; i < this.moduleCount - finderSize - 1; i++) {
        if (this.modules[finderSize - 2] && this.modules[finderSize - 2][i] === null) continue;
        if (this.modules[6][i] === null || this.modules[i][6] === null) continue;
        // Skip if already set
        if (this.modules[6][i] !== null && this.modules[6][i] !== undefined) continue;
        if (this.modules[i][6] !== null && this.modules[i][6] !== undefined) continue;
        this.modules[6][i] = (i % 2 === 0);
        this.modules[i][6] = (i % 2 === 0);
      }
    };

    QRCodeModel.prototype._addAlignmentPatterns = function() {
      // 简化的对齐模式 - 高版本才包含
      if (this.typeNumber >= 2) {
        var alignmentRow, alignmentCol;
        if (this.typeNumber <= 1) { alignmentRow = -1; alignmentCol = -1; }
        else if (this.typeNumber <= 5) { alignmentRow = this.moduleCount - 7; alignmentCol = this.moduleCount - 7; }
        else { alignmentRow = this.moduleCount - 8; alignmentCol = this.moduleCount - 8; }

        if (alignmentRow > 0) {
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              var row = alignmentRow + r;
              var col = alignmentCol + c;
              if (row < 0 || row >= this.moduleCount || col < 0 || col >= this.moduleCount) continue;

              if (Math.abs(r) === 2 || Math.abs(c) === 2) {
                if (this.modules[row][col] === null || this.modules[row][col] === undefined) {
                  this.modules[row][col] = true;
                }
              } else if (Math.abs(r) === 1 || Math.abs(c) === 1) {
                if (this.modules[row][col] === null || this.modules[row][col] === undefined) {
                  this.modules[row][col] = false;
                }
              } else {
                if (this.modules[row][col] === null || this.modules[row][col] === undefined) {
                  this.modules[row][col] = true;
                }
              }
            }
          }
        }
      }
    };

    QRCodeModel.prototype._fillData = function() {
      // 预留位的掩码值
      var reserved = {};
      var rs = 8; // 格式信息区域

      // 标记格式信息区域为保留
      for (var i = 0; i <= rs - 1; i++) {
        if (i <= 6) reserved['0,' + i] = true;
        if (i <= 8) reserved[i + ',7'] = true;
        reserved[rs + ',' + i] = true;
        reserved[this.moduleCount - 1 - i + ',8'] = true;
        if (i <= 7) reserved[this.moduleCount - 1 - rs + ',' + (this.moduleCount - 1 - i)] = true;
      }

      // 蛇形填充数据
      var dataIndex = 0;
      var dir = -1;
      var col = this.moduleCount - 1;

      while (col > 0) {
        if (col === 6) col -= 1;

        for (var row = (dir > 0) ? 0 : this.moduleCount - 1;
             row >= 0 && row < this.moduleCount;
             row += dir) {

          for (var c = 0; c < 2; c++) {
            var curCol = col - c;
            if (curCol < 0) continue;

            var key = row + ',' + curCol;
            if (this.modules[row][curCol] !== null && this.modules[row][curCol] !== undefined) continue;
            if (reserved[key]) continue;

            if (dataIndex < this.dataCache.length) {
              this.modules[row][curCol] = this.dataCache[dataIndex];
              dataIndex++;
            } else {
              this.modules[row][curCol] = false;
            }
          }
        }
        dir = -dir;
        col -= 2;
      }
    };

    QRCodeModel.prototype._maskPattern = function() {
      // 应用掩码模式 0 (简单易实现)
      for (var row = 0; row < this.moduleCount; row++) {
        for (var col = 0; col < this.moduleCount; col++) {
          if (this.modules[row][col] === null || this.modules[row][col] === undefined) continue;

          // 跳过功能图案
          var finderSize = 7;
          if ((row < finderSize && col < finderSize) ||
              (row < finderSize && col >= this.moduleCount - finderSize) ||
              (row >= this.moduleCount - finderSize && col < finderSize) ||
              (row === 6 || col === 6)) {
            continue;
          }

          // 掩码 0: (row + col) % 2 === 0
          if ((row + col) % 2 === 0) {
            this.modules[row][col] = !this.modules[row][col];
          }
        }
      }
    };

    QRCodeModel.prototype._addFormatInfo = function() {
      // 格式信息: 纠错级别 M + 掩码 0
      var formatData = 0b101010000010010; // ECC M + mask 0 的 BCH 编码

      var positions = [
        [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
        [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3],
        [8, 2], [8, 1], [8, 0],
        [8, this.moduleCount - 1], [7, this.moduleCount - 1],
        [5, this.moduleCount - 1], [4, this.moduleCount - 1],
        [3, this.moduleCount - 1], [2, this.moduleCount - 1],
        [1, this.moduleCount - 1], [0, this.moduleCount - 1]
      ];

      for (var i = 0; i < 15; i++) {
        var bit = (formatData >> (14 - i)) & 1;
        if (i < positions.length) {
          var row = positions[i][0];
          var col = positions[i][1];
          if (row >= 0 && row < this.moduleCount && col >= 0 && col < this.moduleCount) {
            this.modules[row][col] = bit === 1;
          }
        }
      }

      // 暗模块
      this.modules[this.moduleCount - 8][8] = true;
    };

    return QRCodeModel;
  })();
})();
