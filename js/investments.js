/* ===== INVESTMENTS ROOM ===== */

let editingInvestmentId = null;

/* ---- Render ---- */
function renderInvestments() {
  const investments = getInvestments();

  const totalCurrentValue = investments.reduce((s, inv) => {
    return s + (parseFloat(inv.currentValue) ?? parseFloat(inv.investedAmount) ?? 0);
  }, 0);
  const totalInvested = investments.reduce((s, inv) => s + (parseFloat(inv.investedAmount) || 0), 0);
  const totalPnl = totalCurrentValue - totalInvested;
  const totalPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  document.getElementById('inv-total-value').textContent = '₪' + fmt(totalCurrentValue);
  document.getElementById('inv-total-invested').textContent = '₪' + fmt(totalInvested);

  const pnlEl = document.getElementById('inv-total-pnl');
  pnlEl.textContent = (totalPnl >= 0 ? '+' : '-') + '₪' + fmt(Math.abs(totalPnl));
  pnlEl.style.color = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';

  const pctEl = document.getElementById('inv-total-pct');
  pctEl.textContent = fmtPct(totalPct);
  pctEl.style.color = totalPct >= 0 ? 'var(--green)' : 'var(--red)';

  const grid  = document.getElementById('inv-cards-grid');
  const empty = document.getElementById('inv-empty');

  if (investments.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  const values = investments.map(inv =>
    parseFloat(inv.currentValue) ?? parseFloat(inv.investedAmount) ?? 0
  );
  const positiveValues = values.filter(v => v > 0);
  const minValue = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;

  grid.innerHTML = investments.map((inv, i) => {
    const currentVal = parseFloat(inv.currentValue) ?? parseFloat(inv.investedAmount) ?? 0;
    const invested   = parseFloat(inv.investedAmount) || 0;
    const pnl        = currentVal - invested;
    const pnlPct     = invested > 0 ? (pnl / invested) * 100 : 0;
    const portPct    = totalCurrentValue > 0 ? (currentVal / totalCurrentValue) * 100 : 0;
    const ratio      = minValue > 0 && positiveValues.length > 1 ? currentVal / minValue : null;

    const pnlClass = pnl >= 0 ? 'return-positive' : 'return-negative';
    const pnlSign  = pnl >= 0 ? '+' : '-';

    const nameRow = inv.name
      ? `<span class="inv-name">${escHtml(inv.name)}</span>`
      : '';

    const metaParts = [];
    if (inv.entryDate)  metaParts.push(`כניסה: ${fmtDate(inv.entryDate)}`);
    if (inv.entryPrice) metaParts.push(`מחיר: ₪${fmt(inv.entryPrice)}`);
    if (inv.quantity)   metaParts.push(`כמות: ${parseFloat(inv.quantity).toLocaleString('en-US')}`);

    return `<div class="inv-card">
      <div class="inv-card-header">
        <div class="inv-card-title-row">
          <span class="inv-ticker">${escHtml(inv.ticker || inv.name || '—')}</span>
          ${nameRow}
        </div>
        <div class="action-btns">
          <button class="btn-icon" onclick="openInvestmentModal('${inv.id}')" title="עריכה">✏️</button>
          <button class="btn-icon btn-icon-del" onclick="confirmDeleteInvestment('${inv.id}')" title="מחיקה">🗑️</button>
        </div>
      </div>

      ${metaParts.length ? `<div class="inv-card-meta">${metaParts.map(p => `<span>${p}</span>`).join('')}</div>` : ''}

      <div class="inv-card-values">
        <div class="inv-val-block">
          <span class="inv-val-label">הושקע</span>
          <span class="inv-val">₪${fmt(invested)}</span>
        </div>
        <div class="inv-val-block">
          <span class="inv-val-label">שווי נוכחי</span>
          <span class="inv-val">₪${fmt(currentVal)}</span>
        </div>
        <div class="inv-val-block">
          <span class="inv-val-label">רווח/הפסד</span>
          <span class="inv-val ${pnlClass}">${pnlSign}₪${fmt(Math.abs(pnl))}<br><small>${fmtPct(pnlPct)}</small></span>
        </div>
      </div>

      <div class="inv-card-allocation">
        <div class="inv-alloc-header">
          <span class="inv-alloc-label">חלק מהתיק</span>
          <div class="inv-alloc-badges">
            <span class="inv-alloc-pct">${portPct.toFixed(1)}%</span>
            ${ratio !== null ? `<span class="inv-ratio" title="פי ${ratio.toFixed(1)} מההשקעה הקטנה ביותר">×${ratio.toFixed(1)}</span>` : ''}
          </div>
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
    document.getElementById('inv-modal-title').textContent          = 'עריכת השקעה';
    document.getElementById('i-ticker').value                       = inv.ticker          || '';
    document.getElementById('i-name').value                         = inv.name            || '';
    document.getElementById('i-entry-date').value                   = inv.entryDate       || '';
    document.getElementById('i-entry-price').value                  = inv.entryPrice      || '';
    document.getElementById('i-quantity').value                     = inv.quantity        || '';
    document.getElementById('i-invested-amount').value              = inv.investedAmount  || '';
    document.getElementById('i-current-value').value                = inv.currentValue    || '';
    document.getElementById('i-notes').value                        = inv.notes           || '';
  } else {
    document.getElementById('inv-modal-title').textContent = 'השקעה חדשה';
    document.getElementById('i-entry-date').value = new Date().toISOString().slice(0, 10);
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

  const ticker         = document.getElementById('i-ticker').value.toUpperCase().trim();
  const name           = document.getElementById('i-name').value.trim();
  const entryPrice     = parseFloat(document.getElementById('i-entry-price').value)     || null;
  const quantity       = parseFloat(document.getElementById('i-quantity').value)        || null;
  let   investedAmount = parseFloat(document.getElementById('i-invested-amount').value) || null;
  const currentValue   = parseFloat(document.getElementById('i-current-value').value)  || null;

  // Auto-calc invested amount when not filled in
  if (!investedAmount && entryPrice && quantity) {
    investedAmount = entryPrice * quantity;
  }

  const data = {
    ticker,
    name,
    entryDate:      document.getElementById('i-entry-date').value,
    entryPrice,
    quantity,
    investedAmount,
    currentValue,
    notes:          document.getElementById('i-notes').value.trim(),
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
  showConfirm(`למחוק את ההשקעה "${inv.ticker || inv.name}"?`, () => {
    deleteInvestment(id);
    renderInvestments();
    showToast('השקעה נמחקה', 'success');
  });
}

/* ---- Auto-calc invested amount in modal ---- */
function calcInvestedFromPriceQty() {
  const price = parseFloat(document.getElementById('i-entry-price').value);
  const qty   = parseFloat(document.getElementById('i-quantity').value);
  const amountField = document.getElementById('i-invested-amount');
  if (price > 0 && qty > 0 && !amountField.value) {
    amountField.value = (price * qty).toFixed(2);
  }
}
