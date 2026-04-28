/* ===== INVESTMENTS ROOM ===== */

let editingInvestmentId = null;

/* ---- Render ---- */
function renderInvestments() {
  const investments = getInvestments();

  // Total = manual override if set, else sum of currentValues
  const sumCurrentValues = investments.reduce(
    (s, inv) => s + (parseFloat(inv.currentValue) || 0), 0
  );
  const storedTotal = getInvPortfolioTotal();
  const total = storedTotal > 0 ? storedTotal : sumCurrentValues;

  // Sync input field
  const totalInput = document.getElementById('inv-portfolio-total-input');
  if (totalInput && storedTotal > 0) totalInput.value = storedTotal;

  const grid  = document.getElementById('inv-cards-grid');
  const empty = document.getElementById('inv-empty');

  // Allocation breakdown (always render)
  renderInvAllocation(investments, total);

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

/* ---- Update total (called from input) ---- */
function updateInvTotal(value) {
  saveInvPortfolioTotal(parseFloat(value) || 0);
  renderInvestments();
}

/* ---- Allocation breakdown card ---- */
function renderInvAllocation(investments, total) {
  const container = document.getElementById('inv-allocation-list');
  if (!container) return;

  if (!investments.length || total === 0) {
    container.innerHTML = '<p class="empty-sub" style="text-align:center;padding:1rem 0;">אין נתונים לתצוגה</p>';
    return;
  }

  const sorted = investments.slice().sort(
    (a, b) => (parseFloat(b.currentValue) || 0) - (parseFloat(a.currentValue) || 0)
  );

  const sumCurrent = investments.reduce(
    (s, inv) => s + (parseFloat(inv.currentValue) || 0), 0
  );
  const cash = total - sumCurrent;

  // Color palette matching chart colors
  const colors = [
    '#38bdf8','#22c55e','#f59e0b','#a78bfa','#fb7185',
    '#34d399','#60a5fa','#fbbf24','#c084fc','#f87171',
    '#2dd4bf','#818cf8',
  ];

  const rows = sorted.map((inv, i) => {
    const val    = parseFloat(inv.currentValue) || 0;
    const pct    = (val / total) * 100;
    const color  = colors[i % colors.length];
    return `<div class="inv-alloc-row">
      <div class="inv-alloc-row-header">
        <div class="inv-alloc-row-left">
          <span class="inv-alloc-dot" style="background:${color}"></span>
          <span class="inv-alloc-ticker">${escHtml(inv.ticker || '—')}</span>
        </div>
        <div class="inv-alloc-row-right">
          <span class="inv-alloc-amount">$${fmt(val)}</span>
          <span class="inv-alloc-pct-badge">${pct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="inv-progress-track">
        <div class="inv-progress-bar" style="width:${Math.min(pct, 100).toFixed(2)}%;background:${color}"></div>
      </div>
    </div>`;
  });

  // Add cash row if total > sum
  if (cash > 0.01) {
    const cashPct = (cash / total) * 100;
    rows.push(`<div class="inv-alloc-row">
      <div class="inv-alloc-row-header">
        <div class="inv-alloc-row-left">
          <span class="inv-alloc-dot" style="background:#64748b"></span>
          <span class="inv-alloc-ticker" style="color:var(--text-muted)">מזומן / אחר</span>
        </div>
        <div class="inv-alloc-row-right">
          <span class="inv-alloc-amount">$${fmt(cash)}</span>
          <span class="inv-alloc-pct-badge" style="color:var(--text-muted);background:rgba(100,116,139,.15)">${cashPct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="inv-progress-track">
        <div class="inv-progress-bar" style="width:${Math.min(cashPct, 100).toFixed(2)}%;background:#64748b"></div>
      </div>
    </div>`);
  }

  container.innerHTML = rows.join('');
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
