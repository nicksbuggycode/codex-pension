// Pension projection app (FERS-style) for a current age of 40
// Public info used: FERS basic annuity factors: 1.0% of high-3 x years; 1.1% if age 62+ with 20+ years.

// Utility formatters
const fmtCurrency = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (n) => `${(n*100).toFixed(1)}%`;

// Compute high-3 average given current salary S0, growth g, and years t until retirement
// We approximate the last 3 years salaries and average them.
function high3(currentSalary, growthRate, yearsFromNow) {
  const g = growthRate;
  const s1 = currentSalary * Math.pow(1 + g, Math.max(0, yearsFromNow - 2));
  const s2 = currentSalary * Math.pow(1 + g, Math.max(0, yearsFromNow - 1));
  const s3 = currentSalary * Math.pow(1 + g, Math.max(0, yearsFromNow));
  return (s1 + s2 + s3) / 3;
}

// Factor per FERS rule of thumb
function fersFactor(age, serviceYears) {
  if (age >= 62 && serviceYears >= 20) return 0.011; // 1.1%
  return 0.01; // 1.0%
}

// Real (today's dollars) value given nominal n at time t with inflation i
function toRealDollars(nominal, inflationRate, years) {
  return nominal / Math.pow(1 + inflationRate, years);
}

function buildProjection({
  currentAge = 40,
  currentSalary,
  serviceYears,
  growthRate, // as decimal
  inflationRate, // as decimal
  horizonYears,
  kBalanceStart,
  kReturnRate, // as decimal
  kWithdrawRate, // as decimal
  raisePct, // as decimal (immediate raise on current salary)
}) {
  const rows = [];
  const startSalary = currentSalary * (1 + raisePct);
  let kBalance = kBalanceStart;
  for (let t = 1; t <= horizonYears; t++) {
    const age = currentAge + t;
    const service = serviceYears + t;
    const salaryThisYear = startSalary * Math.pow(1 + growthRate, t);
    const h3 = high3(startSalary, growthRate, t);
    const factor = fersFactor(age, service);
    const annual = factor * h3 * service;
    const annualReal = toRealDollars(annual, inflationRate, t);
    // 401k/TSP projection with 10% employee contribution on salaryThisYear
    const kContrib = 0.10 * salaryThisYear;
    kBalance = kBalance * (1 + kReturnRate) + kContrib;
    const kIncomeAnnual = kWithdrawRate * kBalance; // withdrawal rule (slider)
    const kIncomeAnnualReal = toRealDollars(kIncomeAnnual, inflationRate, t);
    const totalAnnual = annual + kIncomeAnnual;
    const totalMonthly = totalAnnual / 12;
    rows.push({ t, age, service, salaryThisYear, h3, factor, annual, annualReal, kBalance, kContrib, kIncomeAnnual, kIncomeAnnualReal, totalAnnual, totalMonthly });
  }
  return rows;
}

function updateSummary(rows) {
  const next = rows[1] || rows[0];
  const max = rows.reduce((a, b) => (a.annual > b.annual ? a : b), rows[0]);

  const milestone = rows.find(r => r.age >= 62 && r.service >= 20) || rows.find(r => r.age >= 62) || rows[0];
  document.getElementById('milestoneLabel').textContent = `Age ${milestone.age}${milestone.age >= 62 && milestone.service >= 20 ? ' (1.1% factor)' : ''}`;
  document.getElementById('milestoneAmount').textContent = `${fmtCurrency(milestone.annual)} / yr`;
  document.getElementById('nextYearAnnual').textContent = fmtCurrency(next.annual);
  document.getElementById('maxAnnual').textContent = fmtCurrency(max.annual);
  document.getElementById('maxAnnualMeta').textContent = `at age ${max.age}`;
}

function renderTable(rows) {
  const tbody = document.querySelector('#resultsTable tbody');
  tbody.innerHTML = '';
  const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.age}</td>
      <td>${nf0.format(r.service)}</td>
      <td>${fmtCurrency(r.salaryThisYear)}</td>
      <td>${fmtCurrency(r.h3)}</td>
      <td>${fmtPct(r.factor)}</td>
      <td>${fmtCurrency(r.annual)}</td>
      <td>${fmtCurrency(r.annualReal)}</td>
      <td>${fmtCurrency(r.kBalance)}</td>
      <td>${fmtCurrency(r.kContrib)}</td>
      <td>${fmtCurrency(r.kIncomeAnnual)}</td>
      <td>${fmtCurrency(r.totalAnnual)}</td>
      <td>${fmtCurrency(r.totalMonthly)}</td>
    `;
    tbody.appendChild(tr);
  });
  const rowsCountEl = document.getElementById('rowsCount');
  if (rowsCountEl) rowsCountEl.textContent = `Rows: ${rows.length}`;
}

let chart;
function renderChart(rows, mode) {
  const ctx = document.getElementById('pensionChart');
  const labels = rows.map(r => r.age);

  const isAnnual = mode.includes('annual');
  const isReal = mode.includes('real');
  const dataSeries = rows.map(r => {
    const base = isReal ? r.annualReal : r.annual;
    return isAnnual ? base : base / 12;
  });

  const label = `${isAnnual ? 'Annual' : 'Monthly'} ${isReal ? "(today's $)" : '(nominal)'} pension`;
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 140);
  gradient.addColorStop(0, 'rgba(106,169,255,0.35)');
  gradient.addColorStop(1, 'rgba(106,169,255,0.02)');

  const dataset = {
    label,
    data: dataSeries,
    borderColor: '#6aa9ff',
    backgroundColor: gradient,
    tension: 0.25,
    fill: true,
    pointRadius: 0,
  };

  const yFmt = (v) => v >= 1000 ? ('$' + Math.round(v/1000) + 'k') : ('$' + Math.round(v));

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [dataset] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#a9b2d0' }, title: { display: true, text: 'Age', color: '#a9b2d0' } },
        y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#a9b2d0', callback: yFmt } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${label}: ${fmtCurrency(ctx.parsed.y)}`,
            title: (items) => `Age ${items[0].label}`,
          }
        }
      }
    }
  });

  const legend = document.getElementById('legend');
  legend.textContent = label;
}

function readInputs() {
  const salary = Number(document.getElementById('salary').value || 0);
  const raisePct = Number(document.getElementById('raise').value || 0) / 100;
  const service = Number(document.getElementById('service').value || 0);
  const growth = Number(document.getElementById('growth').value || 0) / 100;
  const inflation = Number(document.getElementById('inflation').value || 0) / 100;
  const horizon = Number(document.getElementById('horizon').value || 30);
  const displayMode = document.getElementById('displayMode').value;
  const kBalance = Number(document.getElementById('kBalance').value || 0);
  const kReturn = Number(document.getElementById('kReturn').value || 0) / 100;
  const kWithdraw = Number(document.getElementById('kWithdraw').value || 0) / 100;
  return { salary, raisePct, service, growth, inflation, horizon, displayMode, kBalance, kReturn, kWithdraw };
}

function clampInputs() {
  const salaryEl = document.getElementById('salary');
  const serviceEl = document.getElementById('service');
  const kBalEl = document.getElementById('kBalance');
  if (Number(salaryEl.value) < 0) salaryEl.value = 0;
  if (Number(serviceEl.value) < 0) serviceEl.value = 0;
  if (Number(kBalEl.value) < 0) kBalEl.value = 0;
}

function computeAndRender() {
  clampInputs();
  const { salary, raisePct, service, growth, inflation, horizon, displayMode, kBalance, kReturn, kWithdraw } = readInputs();
  const rows = buildProjection({ currentSalary: salary, serviceYears: service, growthRate: growth, inflationRate: inflation, horizonYears: horizon, kBalanceStart: kBalance, kReturnRate: kReturn, kWithdrawRate: kWithdraw, raisePct });
  updateSummary(rows);
  renderChart(rows, displayMode);
  renderTable(rows);
}

function wireUp() {
  const form = document.getElementById('controls');
  form.addEventListener('submit', (e) => { e.preventDefault(); computeAndRender(); });
  form.addEventListener('input', () => computeAndRender());
  // show live value for kReturn slider
  const kReturnEl = document.getElementById('kReturn');
  const kReturnValue = document.getElementById('kReturnValue');
  const updateKReturnValue = () => kReturnValue.textContent = `${Number(kReturnEl.value).toFixed(1)}%`;
  kReturnEl.addEventListener('input', updateKReturnValue);
  updateKReturnValue();
  // immediate raise slider live value
  const raiseEl = document.getElementById('raise');
  const raiseValue = document.getElementById('raiseValue');
  const updateRaiseValue = () => raiseValue.textContent = `${Number(raiseEl.value).toFixed(1)}%`;
  raiseEl.addEventListener('input', updateRaiseValue);
  updateRaiseValue();
  // live value for withdrawal rate slider
  const kWithdrawEl = document.getElementById('kWithdraw');
  const kWithdrawValue = document.getElementById('kWithdrawValue');
  const updateKWithdrawValue = () => kWithdrawValue.textContent = `${Number(kWithdrawEl.value).toFixed(1)}%`;
  kWithdrawEl.addEventListener('input', updateKWithdrawValue);
  updateKWithdrawValue();
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('salary').value = 90000;
    document.getElementById('service').value = 10;
    document.getElementById('kBalance').value = 150000;
    document.getElementById('kReturn').value = 5.0; 
    updateKReturnValue();
    document.getElementById('kWithdraw').value = 4.0; 
    updateKWithdrawValue();
    document.getElementById('growth').value = 2.5;
    document.getElementById('inflation').value = 2.0;
    document.getElementById('horizon').value = 30;
    document.getElementById('displayMode').value = 'annual-nominal';
    computeAndRender();
  });
  // export CSV
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    const { salary, raisePct, service, growth, inflation, horizon, displayMode, kBalance, kReturn, kWithdraw } = readInputs();
    const rows = buildProjection({ currentSalary: salary, serviceYears: service, growthRate: growth, inflationRate: inflation, horizonYears: horizon, kBalanceStart: kBalance, kReturnRate: kReturn, kWithdrawRate: kWithdraw, raisePct });
    const header = ['Age','Service','Salary','High3','Factor','PensionAnnual','PensionAnnualReal','KBalance','KContrib','KIncomeAnnual','TotalAnnual','TotalMonthly'];
    const csv = [header.join(',')].concat(rows.map(r => [r.age,r.service,Math.round(r.salaryThisYear),Math.round(r.h3),r.factor,(Math.round(r.annual)),(Math.round(r.annualReal)),(Math.round(r.kBalance)),(Math.round(r.kContrib)),(Math.round(r.kIncomeAnnual)),(Math.round(r.totalAnnual)),(Math.round(r.totalMonthly))].join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'projection.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  computeAndRender();
}

document.addEventListener('DOMContentLoaded', wireUp);
