/* ===== INVESTMENTS ROOM ===== */

let editingInvestmentId = null;

/* ---- Render ---- */
function renderInvestments() {
  const investments = getInvestments();

  const totalCurrentValue = investments.reduce(
    (s, inv) => s + (parseFloat(inv.currentValue) || 0), 0
  );

  document.getElementById('inv-total-value').textContent = '$' + fmt(totalCurrentValue);

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
    const portPct    = totalCurrentValue > 0 ? (currentVal / totalCurrentValue) * 100 : 0;

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
          <div class="inv-progress-bar" style="width:${portPct.toFixed(2)}%"></div>
        </div>
      </div>

      ${inv.notes ? `<p class="inv-notes">${escHtml(inv.notes)}</p>` : ''}
    </div>`;
  }).join('');
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
