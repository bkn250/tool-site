/* ============================================
   密码生成器
   ============================================ */
(function() {
  const display = document.getElementById('passwordDisplay');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyPwdBtn');
  const lengthSlider = document.getElementById('lengthSlider');
  const lengthValue = document.getElementById('lengthValue');
  const chkUpper = document.getElementById('chkUpper');
  const chkLower = document.getElementById('chkLower');
  const chkNumber = document.getElementById('chkNumber');
  const chkSymbol = document.getElementById('chkSymbol');
  const chkAmbiguous = document.getElementById('chkAmbiguous');
  const strengthBar = document.getElementById('strengthBar');
  const strengthLabel = document.getElementById('strengthLabel');
  const history = document.getElementById('pwdHistory');

  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBER = '0123456789';
  const SYMBOL = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const AMBIGUOUS = '0OIl1';

  function getCharset() {
    let chars = '';
    if (chkUpper.checked) chars += UPPER;
    if (chkLower.checked) chars += LOWER;
    if (chkNumber.checked) chars += NUMBER;
    if (chkSymbol.checked) chars += SYMBOL;

    if (chkAmbiguous.checked) {
      for (const c of AMBIGUOUS) {
        chars = chars.replace(new RegExp('\\' + c, 'g'), '');
      }
    }

    if (!chars) {
      chars = UPPER + LOWER + NUMBER;
      chkUpper.checked = true;
      chkLower.checked = true;
      chkNumber.checked = true;
    }
    return chars;
  }

  function generatePassword() {
    const length = parseInt(lengthSlider.value);
    const chars = getCharset();

    // 使用 crypto.getRandomValues 生成密码
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[array[i] % chars.length];
    }

    // 保证每种选中的类型至少出现一次
    let guaranteed = '';
    if (chkUpper.checked) guaranteed += UPPER[array[0] % UPPER.length];
    if (chkLower.checked) guaranteed += LOWER[array[1] % LOWER.length];
    if (chkNumber.checked) guaranteed += NUMBER[array[2] % NUMBER.length];
    if (chkSymbol.checked) guaranteed += SYMBOL[array[3] % SYMBOL.length];

    // 把保证字符混入密码开头
    if (guaranteed.length > 0) {
      password = guaranteed + password.slice(guaranteed.length);
      // 打乱前几个字符
      const prefix = password.substring(0, guaranteed.length).split('');
      for (let i = prefix.length - 1; i > 0; i--) {
        const j = array[4] % (i + 1);
        [prefix[i], prefix[j]] = [prefix[j], prefix[i]];
      }
      password = prefix.join('') + password.slice(guaranteed.length);
    }

    display.textContent = password;
    updateStrength(length);
    addHistory(password);
  }

  function updateStrength(length) {
    let score = 0;
    const types = [chkUpper.checked, chkLower.checked, chkNumber.checked, chkSymbol.checked].filter(Boolean).length;

    score += length * 4;
    score += types * 10;

    let percent, label, color;
    if (score < 30) { percent = 25; label = '弱'; color = '#ef4444'; }
    else if (score < 50) { percent = 50; label = '中等'; color = '#f59e0b'; }
    else if (score < 80) { percent = 75; label = '强'; color = '#10b981'; }
    else { percent = 100; label = '非常强 🛡️'; color = '#4f46e5'; }

    strengthBar.style.width = percent + '%';
    strengthBar.style.background = color;
    strengthLabel.textContent = `密码强度: ${label}`;
    strengthLabel.style.color = color;
  }

  let historyItems = [];
  function addHistory(pwd) {
    historyItems.unshift(pwd);
    if (historyItems.length > 20) historyItems.pop();
    history.innerHTML = historyItems.map((p, i) =>
      `<div style="padding:4px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="copyToClipboard('${p.replace(/'/g, "\\'")}')">${i === 0 ? '🆕' : '📄'} <code>${p}</code></div>`
    ).join('');
    if (historyItems.length > 0) {
      history.querySelector('div').scrollIntoView();
    }
  }

  lengthSlider.addEventListener('input', () => {
    lengthValue.textContent = lengthSlider.value;
    generatePassword();
  });

  document.querySelectorAll('.options-grid input').forEach(el => {
    el.addEventListener('change', generatePassword);
  });

  generateBtn.addEventListener('click', generatePassword);

  copyBtn.addEventListener('click', () => {
    copyToClipboard(display.textContent);
  });

  display.addEventListener('click', () => {
    copyToClipboard(display.textContent);
  });

  generatePassword();
})();
