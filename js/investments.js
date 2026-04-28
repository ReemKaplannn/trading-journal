/* ===== INVESTMENTS ROOM ===== */

let editingInvestmentId = null;
let invChartInstance    = null;

const INV_COLORS = [
  '#38bdf8','#22c55e','#f59e0b','#a78bfa','#fb7185',
  '#34d399','#60a5fa','#fbbf24','#c084fc','#f87171',
  '#2dd4bf','#818cf8',
];

/* ---- Render ---- */
function renderInvestments() {
  const investments = getInvestments();

  // Total = manual override if set, else sum of currentValues
  const sumCurrentValues = investments.reduce(
    (s, inv) => s + (parseFloat(inv.currentValue) || 0), 0
  );
  const storedTotal = getInvPortfolioTotal();
  const total = storedTotal > 0 ? storedTotal : sumCurrentValues;

  // Sync total input field
  const totalInput = document.getElementById('inv-portfolio-total-input');
  if (totalInput && storedTotal > 0) totalInput.value = storedTotal;

  // Sync last-updated widget
  renderInvUpdatedWidget();

  // Donut chart
  renderInvDonutChart(investments, total);

  const grid  = document.getElementById('inv-cards-grid');
  const empty = document.getElementById('inv-empty');

  if (investments.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  grid.innerHTML = investments.map(inv => {
    const currentVal = parseFloat(inv.currentValue) || 0;
    const portPct    = total > 0 ? (currentVal / total) * 100 : 0;

    return `<div class="inv-card">
      <div class="inv-card-header">
        <span class="inv-ticker">${escHtml(inv.ticker || '—')}</span>
        <div class="action-btns">
          <button class="btn-icon" onclick="openInvestmentModal('${inv.id}')" title="עריכה">✏️</button>
          <button class="btn-icon btn-icon-del" onclick="confirmDeleteInvestment('${inv.id}')" title="מחיקה">🗑️</button>
        </div>
      </div>

      <div class="inv-card-values">
        <div class="inv-val-block">
          <span class="inv-val-label">מחיר בפנים</span>
          <span class="inv-val">${inv.entryPrice ? '$' + fmt(inv.entryPrice) : '—'}</span>
        </div>
        <div class="inv-val-block">
          <span class="inv-val-label">כמות</span>
          <span class="inv-val">${inv.quantity ? parseFloat(inv.quantity).toLocaleString('en-US') : '—'}</span>
        </div>
        <div class="inv-val-block">
          <span class="inv-val-label">שווי נוכחי</span>
          <span class="inv-val">${currentVal ? '$' + fmt(currentVal) : '—'}</span>
        </div>
      </div>

      <div class="inv-card-allocation">
        <div class="inv-alloc-header">
          <span class="inv-alloc-label">חלק מהתיק</span>
          <span class="inv-alloc-pct">${portPct.toFixed(1)}%</span>
        </div>
        <div class="inv-progress-track">
          <div class="inv-progress-bar" style="width:${Math.min(portPct, 100).toFixed(2)}%"></div>
        </div>
      </div>

      ${inv.notes ? `<p class="inv-notes">${escHtml(inv.notes)}</p>` : ''}
    </div>`;
  }).join('');
}

/* ---- Donut Chart ---- */
function renderInvDonutChart(investments, total) {
  const canvas   = document.getElementById('inv-portfolio-chart');
  const emptyMsg = document.getElementById('inv-chart-empty');
  if (!canvas) return;

  // Build sorted data (only investments with currentValue)
  const sorted = investments
    .filter(inv => parseFloat(inv.currentValue) > 0)
    .sort((a, b) => (parseFloat(b.currentValue) || 0) - (parseFloat(a.currentValue) || 0));

  const sumCurrent = investments.reduce((s, inv) => s + (parseFloat(inv.currentValue) || 0), 0);
  const cash       = total > sumCurrent ? total - sumCurrent : 0;
  const hasData    = sorted.length > 0;

  if (!hasData && cash < 0.01) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    canvas.style.display = 'none';
    if (invChartInstance) { invChartInstance.destroy(); invChartInstance = null; }
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  canvas.style.display = 'block';

  // Labels include pct for legend readability
  const chartTotal = total > 0 ? total : sumCurrent;
  const labels  = sorted.map(inv => {
    const pct = chartTotal > 0 ? (parseFloat(inv.currentValue) / chartTotal * 100) : 0;
    return `${inv.ticker || '?'}  ${pct.toFixed(1)}%`;
  });
  const values  = sorted.map(inv => parseFloat(inv.currentValue) || 0);
  const colors  = sorted.map((_, i) => INV_COLORS[i % INV_COLORS.length]);

  if (cash > 0.01) {
    const cashPct = (cash / chartTotal) * 100;
    labels.push(`מזומן  ${cashPct.toFixed(1)}%`);
    values.push(cash);
    colors.push('#64748b');
  }

  if (invChartInstance) invChartInstance.destroy();

  invChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderColor:     '#1c2230',
        borderWidth:     3,
        hoverOffset:     8,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:    '#94a3b8',
            font:     { family: 'Heebo', size: 12 },
            padding:  14,
            boxWidth: 12,
            boxHeight:12,
          },
        },
        tooltip: {
          callbacks: {
            title: ctx => {
              // Show raw ticker without the % suffix in tooltip title
              const raw = ctx[0].label || '';
              return raw.split('  ')[0];
            },
            label: ctx => {
              const dataTotal = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = dataTotal > 0 ? (ctx.parsed / dataTotal * 100).toFixed(1) : 0;
              return `  $${fmt(ctx.parsed)}  (${pct}%)`;
            },
          },
          bodyFont:        { family: 'Heebo', size: 13 },
          titleFont:       { family: 'Heebo', size: 13, weight: 'bold' },
          backgroundColor: '#1c2230',
          borderColor:     '#3d4a60',
          borderWidth:     1,
          padding:         10,
        },
      },
    },
  });
}

/* ---- Update total (called from input) ---- */
function updateInvTotal(value) {
  saveInvPortfolioTotal(parseFloat(value) || 0);
  renderInvestments();
}

/* ---- Last-updated widget ---- */
function renderInvUpdatedWidget() {
  const input  = document.getElementById('inv-updated-date');
  const status = document.getElementById('inv-updated-status');
  if (!input || !status) return;

  const saved = getInvUpdatedDate();
  input.value = saved;

  if (!saved) {
    status.textContent = '';
    status.className   = 'inv-updated-status';
    return;
  }

  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const updated  = new Date(saved);
  const diffDays = Math.round((today - updated) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    status.textContent = '✓ מעודכן להיום';
    status.className   = 'inv-updated-status fresh';
  } else if (diffDays <= 3) {
    status.textContent = `לפני ${diffDays} ימים`;
    status.className   = 'inv-updated-status recent';
  } else {
    status.textContent = `לפני ${diffDays} ימים — כדאי לעדכן`;
    status.className   = 'inv-updated-status stale';
  }
}

/* ---- Modal ---- */
function openInvestmentModal(id) {
  editingInvestmentId = id || null;
  const modal = document.getElementById('investment-modal');
  const form  = document.getElementById('investment-form');
  form.reset();

  if (id) {
    const inv = getInvestments().find(i => i.id === id);
    if (!inv) return;
    document.getElementById('inv-modal-title').textContent = 'עריכת השקעה';
    document.getElementById('i-ticker').value        = inv.ticker       || '';
    document.getElementById('i-entry-price').value   = inv.entryPrice   || '';
    document.getElementById('i-quantity').value      = inv.quantity     || '';
    document.getElementById('i-current-value').value = inv.currentValue || '';
    document.getElementById('i-notes').value         = inv.notes        || '';
  } else {
    document.getElementById('inv-modal-title').textContent = 'השקעה חדשה';
  }

  modal.classList.add('open');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('i-ticker').focus(), 50);
}

function closeInvestmentModal() {
  const modal = document.getElementById('investment-modal');
  modal.classList.remove('open');
  modal.style.display = 'none';
  editingInvestmentId = null;
}

function saveInvestmentForm(e) {
  e.preventDefault();
  const data = {
    ticker:       document.getElementById('i-ticker').value.toUpperCase().trim(),
    entryPrice:   parseFloat(document.getElementById('i-entry-price').value)   || null,
    quantity:     parseFloat(document.getElementById('i-quantity').value)       || null,
    currentValue: parseFloat(document.getElementById('i-current-value').value) || null,
    notes:        document.getElementById('i-notes').value.trim(),
  };

  if (editingInvestmentId) {
    updateInvestment(editingInvestmentId, data);
    showToast('השקעה עודכנה ✓', 'success');
  } else {
    addInvestment(data);
    showToast('השקעה נוספה ✓', 'success');
  }

  closeInvestmentModal();
  renderInvestments();
}

/* ---- Delete ---- */
function confirmDeleteInvestment(id) {
  const inv = getInvestments().find(i => i.id === id);
  if (!inv) return;
  showConfirm(`למחוק את ההשקעה "${inv.ticker || '?'}"?`, () => {
    deleteInvestment(id);
    renderInvestments();
    showToast('השקעה נמחקה', 'success');
  });
}
