/* ===== TRADES ROOM ===== */

let tradesFilter = 'all';
let tradesSortKey = 'entryDate';
let tradesSortDir = -1; // -1 = desc, 1 = asc
let editingTradeId = null;

/* ---- KPI Cards ---- */
function renderTradesKpi() {
  const allTrades  = getTrades();
  const openTrades = allTrades.filter(t => t.status === 'open');
  const closed     = allTrades.filter(t => t.status === 'closed');
  const wins       = closed.filter(t => (calcReturnPct(t) || 0) > 0);

  // Open trades count
  const elOpen    = document.getElementById('kpi-open');
  const elOpenCtx = document.getElementById('kpi-open-ctx');
  if (elOpen) {
    elOpen.textContent = openTrades.length;
    elOpen.style.color = '';
    if (elOpenCtx) {
      const invested = openTrades.reduce((s, t) => s + (parseFloat(t.entryAmount) || 0), 0);
      elOpenCtx.textContent = invested > 0 ? '$' + fmt(invested, 0) + ' מושקע' : 'אין פוזיציות';
    }
  }

  // Win rate
  const elWR    = document.getElementById('kpi-winrate');
  const elWRCtx = document.getElementById('kpi-winrate-ctx');
  if (elWR) {
    if (closed.length > 0) {
      const wr = (wins.length / closed.length) * 100;
      elWR.textContent = wr.toFixed(1) + '%';
      elWR.style.color = wr >= 50 ? 'var(--green)' : 'var(--red)';
      if (elWRCtx) elWRCtx.textContent = wins.length + '/' + closed.length + ' עסקאות';
    } else {
      elWR.textContent    = '—';
      elWR.style.color    = '';
      if (elWRCtx) elWRCtx.textContent = 'אין עסקאות סגורות';
    }
  }

  // Unrealized P&L
  const elPnl     = document.getElementById('kpi-unrealized');
  const elPnlCtx  = document.getElementById('kpi-unrealized-ctx');
  const kpiPnlCard = elPnl ? elPnl.closest('.kpi-card') : null;
  if (elPnl) {
    const unrealized = openTrades.reduce((s, t) => s + (calcUnrealizedPnl(t) || 0), 0);
    const hasData    = openTrades.some(t => t.currentPrice);
    if (hasData) {
      const isPos = unrealized >= 0;
      elPnl.textContent   = (isPos ? '+' : '-') + '$' + fmt(Math.abs(unrealized), 0);
      elPnl.style.color   = isPos ? 'var(--green)' : 'var(--red)';
      if (kpiPnlCard) kpiPnlCard.style.borderTopColor = isPos ? 'var(--green)' : 'var(--red)';
      if (elPnlCtx) {
        const n = openTrades.filter(t => t.currentPrice).length;
        elPnlCtx.textContent = n + ' עסקאות עם מחיר נוכחי';
      }
    } else {
      elPnl.textContent  = '—';
      elPnl.style.color  = '';
      if (kpiPnlCard) kpiPnlCard.style.borderTopColor = '';
      if (elPnlCtx) elPnlCtx.textContent = 'עדכן מחיר נוכחי בעסקאות';
    }
  }

  // Avg position size
  const elAvg    = document.getElementById('kpi-avg-pos');
  const elAvgCtx = document.getElementById('kpi-avg-pos-ctx');
  if (elAvg) {
    if (openTrades.length > 0) {
      const total = openTrades.reduce((s, t) => s + (parseFloat(t.entryAmount) || 0), 0);
      const avg   = total / openTrades.length;
      elAvg.textContent = '$' + fmt(avg, 0);
      if (elAvgCtx) {
        const ps = getPortfolioSize();
        elAvgCtx.textContent = ps > 0 ? (avg / ps * 100).toFixed(1) + '% מהתיק' : '';
      }
    } else {
      elAvg.textContent = '—';
      if (elAvgCtx) elAvgCtx.textContent = '';
    }
  }
}

/* ---- Render ---- */
function renderTrades() {
  let trades = getTrades();
  const portfolioSize = getPortfolioSize();

  // Filter — 'all': open + closed within 14 days; 'open': open only
  const cutoff14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  if (tradesFilter === 'all') {
    trades = trades.filter(t =>
      t.status === 'open' || (t.exitDate && new Date(t.exitDate) >= cutoff14)
    );
  }
  if (tradesFilter === 'open') trades = trades.filter(t => t.status === 'open');

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
      <td>${fmtDatetime(t.entryDate, t.entryTime)}</td>
      <td>$${fmt(t.entryPrice, 2)}</td>
      <td>$${fmt(t.entryAmount, 2)}</td>
      <td>${t.stopLoss ? '$' + fmt(t.stopLoss, 2) : '—'}</td>
      <td class="td-reason">${reason}</td>
      <td>${fmtDatetime(t.exitDate, t.exitTime)}</td>
      <td>${t.exitPrice ? '$' + fmt(t.exitPrice, 2) : '—'}</td>
      <td class="${retClass}">${ret !== null ? fmtPct(ret) : '—'}</td>
      <td>${portPct !== null ? portPct.toFixed(1) + '%' : '—'}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-btns">
          ${t.status === 'open' ? `<button class="btn-icon btn-icon-close" onclick="openCloseTradeModal('${t.id}')" title="סגור עסקה">🔒</button>` : ''}
          <button class="btn-icon" onclick="openTradeModal('${t.id}')" title="עריכה">✏️</button>
          <button class="btn-icon btn-icon-del" onclick="confirmDeleteTrade('${t.id}')" title="מחיקה">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  updateSortHeaders();
  renderTradesKpi();
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
    document.getElementById('f-entry-time').value    = trade.entryTime    || '';
    document.getElementById('f-exit-date').value     = trade.exitDate     || '';
    document.getElementById('f-exit-time').value     = trade.exitTime     || '';
    document.getElementById('f-exit-price').value    = trade.exitPrice    || '';
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
    entryTime:    document.getElementById('f-entry-time').value || null,
    entryPrice:   parseFloat(document.getElementById('f-entry-price').value),
    entryAmount:  parseFloat(document.getElementById('f-entry-amount').value),
    stopLoss:     parseFloat(document.getElementById('f-stop-loss').value) || null,
    entryReason:  document.getElementById('f-entry-reason').value.trim(),
    exitDate,
    exitTime:     document.getElementById('f-exit-time').value || null,
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

/* ---- Close Trade Modal ---- */
let closingTradeId = null;

function openCloseTradeModal(id) {
  const trade = getTrades().find(t => t.id === id);
  if (!trade) return;
  closingTradeId = id;
  document.getElementById('close-trade-ticker').textContent = trade.ticker;
  const today   = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  document.getElementById('ct-exit-date').value  = today;
  document.getElementById('ct-exit-time').value  = nowTime;
  document.getElementById('ct-exit-price').value = '';
  const modal = document.getElementById('close-trade-modal');
  modal.classList.add('open');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('ct-exit-price').focus(), 50);
}

function closeCloseTradeModal() {
  const modal = document.getElementById('close-trade-modal');
  modal.classList.remove('open');
  modal.style.display = 'none';
  closingTradeId = null;
}

function saveCloseTradeForm(e) {
  e.preventDefault();
  if (!closingTradeId) return;
  const exitDate  = document.getElementById('ct-exit-date').value;
  const exitTime  = document.getElementById('ct-exit-time').value || null;
  const exitPrice = parseFloat(document.getElementById('ct-exit-price').value);
  if (!exitDate || !exitPrice) return;
  updateTrade(closingTradeId, { exitDate, exitTime, exitPrice, status: 'closed' });
  closeCloseTradeModal();
  renderTrades();
  renderPortfolio();
  showToast('עסקה נסגרה ✓', 'success');
}

/* ---- Util ---- */
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
