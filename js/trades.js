/* ===== TRADES ROOM ===== */

let tradesFilter = 'all';
let tradesSortKey = 'entryDate';
let tradesSortDir = -1; // -1 = desc, 1 = asc
let editingTradeId = null;

/* ---- Render ---- */
function renderTrades() {
  let trades = getTrades();
  const portfolioSize = getPortfolioSize();

  // Filter
  if (tradesFilter === 'open')   trades = trades.filter(t => t.status === 'open');
  if (tradesFilter === 'closed') trades = trades.filter(t => t.status === 'closed');

  // Sort
  trades = trades.slice().sort((a, b) => {
    let va = a[tradesSortKey], vb = b[tradesSortKey];

    if (tradesSortKey === 'returnPct') {
      va = calcReturnPct(a); vb = calcReturnPct(b);
      if (va === null) va = -Infinity;
      if (vb === null) vb = -Infinity;
    } else if (['entryPrice','exitPrice','entryAmount','stopLoss'].includes(tradesSortKey)) {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
    } else {
      va = va || '';
      vb = vb || '';
    }

    if (va < vb) return -1 * tradesSortDir;
    if (va > vb) return  1 * tradesSortDir;
    return 0;
  });

  const tbody = document.getElementById('trades-tbody');
  const empty = document.getElementById('trades-empty');

  if (trades.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    document.getElementById('trades-table').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('trades-table').style.display = '';

  tbody.innerHTML = trades.map(t => {
    const ret       = calcReturnPct(t);
    const portPct   = calcPortfolioPct(t, portfolioSize);
    const retClass  = ret === null ? 'return-neutral' : ret >= 0 ? 'return-positive' : 'return-negative';
    const statusBadge = t.status === 'open'
      ? '<span class="status-badge status-open">🟢 פתוחה</span>'
      : '<span class="status-badge status-closed">⚫ סגורה</span>';
    const reason = t.entryReason ? `<span title="${escHtml(t.entryReason)}">${escHtml(t.entryReason.slice(0,40))}${t.entryReason.length > 40 ? '...' : ''}</span>` : '—';

    return `<tr>
      <td><span class="ticker-cell">${escHtml(t.ticker)}</span></td>
      <td>${escHtml(t.sector || '—')}</td>
      <td>${fmtDate(t.entryDate)}</td>
      <td>$${fmt(t.entryPrice, 2)}</td>
      <td>$${fmt(t.entryAmount, 2)}</td>
      <td>${t.stopLoss ? '$' + fmt(t.stopLoss, 2) : '—'}</td>
      <td class="td-reason">${reason}</td>
      <td>${fmtDate(t.exitDate)}</td>
      <td>${t.exitPrice ? '$' + fmt(t.exitPrice, 2) : '—'}</td>
      <td class="${retClass}">${ret !== null ? fmtPct(ret) : '—'}</td>
      <td>${portPct !== null ? portPct.toFixed(1) + '%' : '—'}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="openTradeModal('${t.id}')" title="עריכה">✏️</button>
          <button class="btn-icon btn-icon-del" onclick="confirmDeleteTrade('${t.id}')" title="מחיקה">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  updateSortHeaders();
}

function updateSortHeaders() {
  document.querySelectorAll('#trades-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
  });
  const header = document.querySelector(`#trades-table th[onclick="sortTrades('${tradesSortKey}')"]`);
  if (header) header.classList.add(tradesSortDir === 1 ? 'sort-asc' : 'sort-desc');
}

/* ---- Filter / Sort ---- */
function setTradesFilter(filter) {
  tradesFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  renderTrades();
}

function sortTrades(key) {
  if (tradesSortKey === key) tradesSortDir *= -1;
  else { tradesSortKey = key; tradesSortDir = 1; }
  renderTrades();
}

/* ---- Modal ---- */
function openTradeModal(id) {
  editingTradeId = id || null;
  const modal = document.getElementById('trade-modal');
  const form  = document.getElementById('trade-form');
  form.reset();

  if (id) {
    const trade = getTrades().find(t => t.id === id);
    if (!trade) return;
    document.getElementById('trade-modal-title').textContent = 'עריכת עסקה';
    document.getElementById('f-ticker').value       = trade.ticker        || '';
    document.getElementById('f-sector').value       = trade.sector        || '';
    document.getElementById('f-entry-date').value   = trade.entryDate     || '';
    document.getElementById('f-entry-price').value  = trade.entryPrice    || '';
    document.getElementById('f-entry-amount').value = trade.entryAmount   || '';
    document.getElementById('f-stop-loss').value    = trade.stopLoss      || '';
    document.getElementById('f-entry-reason').value = trade.entryReason   || '';
    document.getElementById('f-exit-date').value    = trade.exitDate      || '';
    document.getElementById('f-exit-price').value   = trade.exitPrice     || '';
    document.getElementById('f-current-price').value = trade.currentPrice || '';
  } else {
    document.getElementById('trade-modal-title').textContent = 'עסקה חדשה';
    document.getElementById('f-entry-date').value = new Date().toISOString().slice(0,10);
  }

  modal.classList.add('open');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('f-ticker').focus(), 50);
}

function closeTradeModal() {
  const modal = document.getElementById('trade-modal');
  modal.classList.remove('open');
  modal.style.display = 'none';
  editingTradeId = null;
}

function saveTradeForm(e) {
  e.preventDefault();
  const exitPrice = parseFloat(document.getElementById('f-exit-price').value) || null;
  const exitDate  = document.getElementById('f-exit-date').value || null;

  const data = {
    ticker:       document.getElementById('f-ticker').value.toUpperCase().trim(),
    sector:       document.getElementById('f-sector').value,
    entryDate:    document.getElementById('f-entry-date').value,
    entryPrice:   parseFloat(document.getElementById('f-entry-price').value),
    entryAmount:  parseFloat(document.getElementById('f-entry-amount').value),
    stopLoss:     parseFloat(document.getElementById('f-stop-loss').value) || null,
    entryReason:  document.getElementById('f-entry-reason').value.trim(),
    exitDate,
    exitPrice,
    currentPrice: parseFloat(document.getElementById('f-current-price').value) || null,
    status:       (exitPrice && exitDate) ? 'closed' : 'open',
  };

  if (editingTradeId) {
    updateTrade(editingTradeId, data);
    showToast('עסקה עודכנה ✓', 'success');
  } else {
    addTrade(data);
    showToast('עסקה נוספה ✓', 'success');
  }

  closeTradeModal();
  renderTrades();
  renderPortfolio();
}

/* ---- Delete ---- */
function confirmDeleteTrade(id) {
  const trade = getTrades().find(t => t.id === id);
  if (!trade) return;
  showConfirm(`למחוק את העסקה "${trade.ticker}"?`, () => {
    deleteTrade(id);
    renderTrades();
    renderPortfolio();
    showToast('עסקה נמחקה', 'success');
  });
}

/* ---- Util ---- */
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
