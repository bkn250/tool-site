(function(){
  const category = document.getElementById('category');
  const fromValue = document.getElementById('fromValue');
  const toValue = document.getElementById('toValue');
  const fromUnit = document.getElementById('fromUnit');
  const toUnit = document.getElementById('toUnit');

  const units = {
    length: { m:1, km:0.001, cm:100, mm:1000, inch:39.3701, foot:3.28084, yard:1.09361, li:'里=500m', mile:0.000621371 },
    weight: { kg:1, g:1000, mg:1e6, ton:0.001, lb:2.20462, oz:35.274, jin:'斤=0.5kg', liang:'两=0.05kg' },
    temperature: { '°C':1, '°F':'custom', 'K':'custom' },
    area: { '㎡':1, km2:1e-6, cm2:10000, ha:1e-4, mu:'亩=666.67㎡', acre:0.000247105, sqft:10.7639 },
    volume: { L:1, mL:1000, m3:0.001, gal:0.264172, qt:1.05669, pint:2.11338, cup:4.22675 }
  };

  const baseUnits = {
    length: { m:1, km:1000, cm:0.01, mm:0.001, inch:0.0254, foot:0.3048, yard:0.9144, li:500, mile:1609.344 },
    weight: { kg:1, g:0.001, mg:1e-6, ton:1000, lb:0.453592, oz:0.0283495, jin:0.5, liang:0.05 },
    area: { '㎡':1, km2:1e6, cm2:1e-4, ha:10000, mu:666.67, acre:4046.86, sqft:0.092903 },
    volume: { L:1, mL:0.001, m3:1000, gal:3.78541, qt:0.946353, pint:0.473176, cup:0.236588 }
  };

  function getUnits(cat) {
    return Object.keys(units[cat] || {});
  }

  function convert(cat, val, from, to) {
    if (cat === 'temperature') {
      let celsius;
      if (from === '°C') celsius = val;
      else if (from === '°F') celsius = (val - 32) * 5/9;
      else if (from === 'K') celsius = val - 273.15;
      if (to === '°C') return celsius;
      if (to === '°F') return celsius * 9/5 + 32;
      if (to === 'K') return celsius + 273.15;
    }
    const base = baseUnits[cat];
    if (!base) return val;
    const fromBase = base[from];
    const toBase = base[to];
    if (!fromBase || !toBase) return val;
    return val * fromBase / toBase;
  }

  function update() {
    const cat = category.value;
    const available = getUnits(cat);
    const oldFrom = fromUnit.value;
    const oldTo = toUnit.value;
    fromUnit.innerHTML = available.map(u => `<option value="${u}"${u===oldFrom||(available.indexOf(u)===0 && !available.includes(oldFrom))?' selected':''}>${u}</option>`).join('');
    toUnit.innerHTML = available.map(u => `<option value="${u}"${u===oldTo||(u===available[1]||(available.indexOf(oldTo)>0 && u===oldTo))?' selected':''}>${u}</option>`).join('');
    calculate();
  }

  function calculate() {
    const cat = category.value;
    const val = parseFloat(fromValue.value) || 0;
    const from = fromUnit.value;
    const to = toUnit.value;
    const result = convert(cat, val, from, to);
    toValue.value = isNaN(result) ? '' : (Math.round(result * 1e8) / 1e8).toString();
  }

  category.addEventListener('change', update);
  fromValue.addEventListener('input', calculate);
  fromUnit.addEventListener('change', calculate);
  toUnit.addEventListener('change', calculate);
  update();
})();
