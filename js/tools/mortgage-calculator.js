/* ============================================
   房贷计算器 - 等额本息+等额本金+提前还款
   ============================================ */
(function() {
  // ===== DOM =====
  const housePrice = document.getElementById('housePrice');
  const downPaymentPct = document.getElementById('downPaymentPct');
  const customDown = document.getElementById('customDown');
  const customDownGroup = document.getElementById('customDownGroup');
  const loanYears = document.getElementById('loanYears');
  const rate = document.getElementById('rate');
  const fundRate = document.getElementById('fundRate');
  const fundRateGroup = document.getElementById('fundRateGroup');
  const fundAmount = document.getElementById('fundAmount');
  const fundAmountGroup = document.getElementById('fundAmountGroup');
  const repayMethod = document.getElementById('repayMethod');
  const startDate = document.getElementById('startDate');
  const calcBtn = document.getElementById('calcBtn');
  const resetBtn = document.getElementById('resetBtn');
  const resultArea = document.getElementById('resultArea');
  const tabs = document.querySelectorAll('.tab-sm');

  // 设置默认日期
  const now = new Date();
  startDate.value = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

  let loanType = 'commercial';
  let scheduleData = [];

  // ===== Tab切换 =====
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loanType = tab.dataset.type;
      fundRateGroup.style.display = loanType === 'combo' ? 'block' : 'none';
      fundAmountGroup.style.display = loanType === 'combo' ? 'block' : 'none';
      if (loanType === 'fund') {
        rate.value = '2.85';
        rate.parentElement.querySelector('span').textContent = '公积金: 3.25% → 首套 2.85%';
      } else {
        rate.value = '3.5';
        rate.parentElement.querySelector('span').textContent = '最新LPR: 3.6% → 首套 3.5%';
      }
    });
  });

  // ===== 首付比例自定义 =====
  downPaymentPct.addEventListener('change', () => {
    customDownGroup.style.display = downPaymentPct.value === '0' ? 'block' : 'none';
  });

  // ===== 计算函数 =====
  function calcEqualInstallment(principal, annualRate, months) {
    const monthRate = annualRate / 100 / 12;
    if (monthRate === 0) return { monthly: principal / months, total: principal, interest: 0, schedule: [] };
    const monthly = principal * monthRate * Math.pow(1+monthRate, months) / (Math.pow(1+monthRate, months)-1);
    const schedule = [];
    let remaining = principal;
    let totalInterest = 0;
    for (let i=1; i<=months; i++) {
      const interest = remaining * monthRate;
      const principalPaid = monthly - interest;
      totalInterest += interest;
      remaining -= principalPaid;
      if (remaining < 0) remaining = 0;
      schedule.push({ month:i, payment:monthly, principal:principalPaid, interest:interest, remaining:remaining });
    }
    return { monthly, total: monthly*months, interest: totalInterest, schedule };
  }

  function calcEqualPrincipal(principal, annualRate, months) {
    const monthRate = annualRate / 100 / 12;
    const principalPerMonth = principal / months;
    const schedule = [];
    let remaining = principal;
    let totalInterest = 0;
    let firstPayment = 0, lastPayment = 0;
    let totalPayment = 0;
    for (let i=1; i<=months; i++) {
      const interest = remaining * monthRate;
      const payment = principalPerMonth + interest;
      totalInterest += interest;
      totalPayment += payment;
      remaining -= principalPerMonth;
      if (remaining < 0) remaining = 0;
      schedule.push({ month:i, payment, principal:principalPerMonth, interest, remaining });
      if (i===1) firstPayment = payment;
      if (i===months) lastPayment = payment;
    }
    return { monthly: firstPayment, firstPayment, lastPayment, total: totalPayment, interest: totalInterest, schedule };
  }

  // ===== 主计算 =====
  function calculate() {
    const hp = parseFloat(housePrice.value) || 0;
    const years = parseInt(loanYears.value);
    const months = years * 12;
    const r = parseFloat(rate.value) || 0;
    const method = repayMethod.value;
    const startStr = startDate.value || (now.getFullYear()+'-01');

    // 计算贷款总额
    let totalPrincipal;
    if (downPaymentPct.value === '0') {
      const down = (parseFloat(customDown.value) || 0) * 10000;
      totalPrincipal = Math.max(0, hp * 10000 - down);
    } else {
      const pct = parseInt(downPaymentPct.value) / 100;
      totalPrincipal = hp * 10000 * (1 - pct);
    }

    if (totalPrincipal <= 0) { alert('贷款金额必须大于0'); return; }

    let fundP = 0;
    if (loanType === 'combo') {
      fundP = (parseFloat(fundAmount.value) || 0) * 10000;
      fundP = Math.min(fundP, totalPrincipal);
    }

    const commercialP = totalPrincipal - fundP;
    const fr = parseFloat(fundRate.value) || 2.85;

    // 分别计算商业+公积金
    let commercialResult, fundResult;

    if (method === 'equal') {
      commercialResult = calcEqualInstallment(commercialP, r, months);
      if (fundP > 0) fundResult = calcEqualInstallment(fundP, fr, months);
    } else {
      commercialResult = calcEqualPrincipal(commercialP, r, months);
      if (fundP > 0) fundResult = calcEqualPrincipal(fundP, fr, months);
    }

    // 合并schedule
    scheduleData = [];
    let firstPayment = 0, lastPayment = 0;
    const totalMonths = months;
    for (let i=0; i<totalMonths; i++) {
      const cs = commercialResult.schedule[i];
      const fs = fundResult ? fundResult.schedule[i] : null;
      const payment = cs.payment + (fs ? fs.payment : 0);
      const principal = cs.principal + (fs ? fs.principal : 0);
      const interest = cs.interest + (fs ? fs.interest : 0);
      const remaining = cs.remaining + (fs ? fs.remaining : 0);
      scheduleData.push({ month:i+1, payment, principal, interest, remaining });
      if (i===0) firstPayment = payment;
      if (i===totalMonths-1) lastPayment = payment;
    }

    const totalInterest = commercialResult.interest + (fundResult ? fundResult.interest : 0);
    const totalPayment = commercialResult.total + (fundResult ? fundResult.total : 0);

    // 显示结果
    resultArea.style.display = 'block';
    resultArea.scrollIntoView({ behavior:'smooth', block:'start' });

    // 月供显示
    if (method === 'equal') {
      const m1 = commercialResult.monthly + (fundResult ? fundResult.monthly : 0);
      document.getElementById('monthlyPayment').innerHTML = '¥' + fmtMoney(m1) + '<small>/月</small>';
      document.getElementById('monthlyRange').textContent = '等额本息：每月还款额固定不变';
    } else {
      document.getElementById('monthlyPayment').innerHTML = '¥' + fmtMoney(firstPayment) + '<small>起/月</small>';
      document.getElementById('monthlyRange').textContent = '等额本金：首月 ¥'+fmtMoney(firstPayment)+' → 末月 ¥'+fmtMoney(lastPayment)+'（逐月递减）';
    }

    document.getElementById('totalLoan').textContent = fmtWan(totalPrincipal);
    document.getElementById('totalInterest').textContent = fmtWan(totalInterest);
    document.getElementById('totalPayment').textContent = fmtWan(totalPayment);
    document.getElementById('firstPayment').textContent = '¥' + fmtMoney(firstPayment);
    document.getElementById('lastPayment').textContent = method==='equal' ? '¥' + fmtMoney(firstPayment) : '¥' + fmtMoney(lastPayment);
    document.getElementById('interestRatio').textContent = (totalInterest/totalPayment*100).toFixed(1)+'%';

    document.getElementById('principalBar').style.width = (totalPrincipal/totalPayment*100).toFixed(1)+'%';
    document.getElementById('interestBar').style.width = (totalInterest/totalPayment*100).toFixed(1)+'%';
    document.getElementById('principalAmt').textContent = fmtWan(totalPrincipal);
    document.getElementById('interestAmt').textContent = fmtWan(totalInterest);

    // 还款明细表
    renderTable(scheduleData, startStr, totalMonths);

    // 提前还款
    document.getElementById('earlyResult').style.display = 'none';
    window._scheduleData = scheduleData;
    window._totalInterest = totalInterest;
    window._method = method;
  }

  // ===== 渲染明细表 =====
  function renderTable(schedule, startStr, total) {
    const [y,m] = startStr.split('-').map(Number);
    const tbody = document.getElementById('paymentBody');
    const tableInfo = document.getElementById('tableInfo');
    let html = '';

    // 显示前12期 + 每年最后一期 + 最后12期
    const showSet = new Set();
    for (let i=1; i<=Math.min(12, total); i++) showSet.add(i);
    for (let i=total; i>=Math.max(total-11, 1); i--) showSet.add(i);
    // 每年末
    for (let y=1; y<=Math.floor(total/12); y++) {
      showSet.add(y*12);
      showSet.add(y*12+1);
    }
    const showArr = [...showSet].sort((a,b)=>a-b);

    let lastShown = 0;
    for (const idx of showArr) {
      if (idx > total) continue;
      if (idx - lastShown > 1) {
        html += '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:6px;">··· 省略 '+(idx-lastShown-1)+' 期 ···</td></tr>';
      }
      lastShown = idx;
      const row = schedule[idx-1];
      const date = addMonths(y, m, row.month-1);
      html += '<tr>'+
        '<td>'+row.month+'</td>'+
        '<td>'+date+'</td>'+
        '<td style="font-weight:600;">¥'+fmtMoney(row.payment)+'</td>'+
        '<td>¥'+fmtMoney(row.principal)+'</td>'+
        '<td>¥'+fmtMoney(row.interest)+'</td>'+
        '<td>¥'+fmtWan(row.remaining)+'</td>'+
        '</tr>';
    }
    tbody.innerHTML = html;
    tableInfo.textContent = '（共 '+total+' 期，折叠显示关键月份）';
  }

  function addMonths(yy, mm, n) {
    const total = yy*12 + mm - 1 + n;
    const ny = Math.floor(total/12);
    const nm = total%12 + 1;
    return ny+'年'+String(nm).padStart(2,'0')+'月';
  }

  // ===== 提前还款 =====
  document.getElementById('earlyCalcBtn').addEventListener('click', ()=>{
    const schedule = window._scheduleData;
    if (!schedule) { alert('请先计算贷款'); return; }
    const earlyMonth = parseInt(document.getElementById('earlyTime').value);
    const earlyAmt = (parseFloat(document.getElementById('earlyAmount').value)||0)*10000;
    if (earlyAmt <= 0 || earlyMonth >= schedule.length) return;

    const row = schedule[earlyMonth-1];
    const newRemaining = row.remaining - earlyAmt;
    if (newRemaining <= 0) {
      document.getElementById('earlyResult').innerHTML = '<div style="color:var(--success);font-weight:600;">✅ 提前还款后可还清全部贷款！</div>';
      document.getElementById('earlyResult').style.display = 'block';
      return;
    }

    // 计算剩余期限的新利息
    const remainingMonths = schedule.length - earlyMonth;
    const r = parseFloat(rate.value) / 100 / 12;
    let newInterest;
    if (window._method === 'equal') {
      const newMonthly = newRemaining * r * Math.pow(1+r, remainingMonths) / (Math.pow(1+r, remainingMonths)-1);
      newInterest = newMonthly * remainingMonths - newRemaining;
    } else {
      const ppm = newRemaining / remainingMonths;
      let totalInt = 0, remain = newRemaining;
      for (let i=0; i<remainingMonths; i++) {
        totalInt += remain * r;
        remain -= ppm;
      }
      newInterest = totalInt;
    }

    const savedInterest = window._totalInterest - (schedule.slice(0, earlyMonth).reduce((s,r)=>s+r.interest,0) + newInterest);

    document.getElementById('earlyResult').innerHTML = `
      <div style="margin-bottom:8px;">提前还款 <b class="highlight-num">¥${fmtMoney(earlyAmt)}</b> 后：</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;">
        <div>剩余本金：<b>¥${fmtWan(newRemaining)}</b></div>
        <div>剩余期数：<b>${remainingMonths} 期</b></div>
        <div>可节省利息：<b style="color:var(--success);">¥${fmtMoney(savedInterest)}</b></div>
      </div>
    `;
    document.getElementById('earlyResult').style.display = 'block';
  });

  // ===== 格式化 =====
  function fmtMoney(num) { return Math.round(num).toLocaleString('zh-CN'); }
  function fmtWan(num) { return (num/10000).toFixed(2)+'万'; }

  // ===== 事件 =====
  calcBtn.addEventListener('click', calculate);
  resetBtn.addEventListener('click', ()=>{
    housePrice.value = '100';
    downPaymentPct.value = '30';
    customDown.value = '30';
    customDownGroup.style.display = 'none';
    loanYears.value = '30';
    rate.value = '3.5';
    fundRate.value = '2.85';
    fundAmount.value = '80';
    repayMethod.value = 'equal';
    resultArea.style.display = 'none';
    window.scrollTo({top:0,behavior:'smooth'});
  });

  // ===== 初始化计算 =====
  calculate();
})();
