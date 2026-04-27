/* ===== HISTORY ROOM ===== */

let histFilter = 'all';
let noteTradeId = null;

/* ---- Filter ---- */
function setHistFilter(f) {
  histFilter = f;
  document.querySelectorAll('[data-hfilter]').forEach(b =>
    b.classList.toggle('active', b.dataset.hfilter === f)
  );
  renderHistory();
}

/* ---- Render ---- */
function renderHistory() {
  const allClosed = getTrades().filter(t => t.status === 'closed');
  renderHistSummary(allClosed);

  let trades = allClosed.slice();

  if (histFilter === 'win')  trades = trades.filter(t => (calcReturnPct(t) || 0) > 0);
  if (histFilter === 'loss') trades = trades.filter(t => (calcReturnPct(t) || 0) <= 0);

  const sortEl  = document.getElementById('hist-sort');
  const sortVal = sortEl ? sortEl.value : 'exitDate-desc';
  const lastDash = sortVal.lastIndexOf('-');
  const sKey = sortVal.slice(0, lastDash);
  const sDir = sortVal.slice(lastDash + 1) === 'desc' ? -1 : 1;

  trades.sort((a, b) => {
    if (sKey === 'pnl') {
      const pa = calcReturnPct(a) !== null ? calcReturnPct(a) : -Infinity;
      const pb = calcReturnPct(b) !== null ? calcReturnPct(b) : -Infinity;
      return (pa - pb) * sDir;
    }
    if (sKey === 'duration') {
      return ((durationMs(a.entryDate, a.exitDate) || 0) - (durationMs(b.entryDate, b.exitDate) || 0)) * sDir;
    }
    const va = a.exitDate || '';
    const vb = b.exitDate || '';
    if (va < vb) return -sDir;
    if (va > vb) return  sDir;
    return 0;
  });

  const tbody = document.getElementById('hist-tbody');
  const empty = document.getElementById('hist-empty');
  const table = document.getElementById('hist-table');

  if (trades.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    table.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  table.style.display = '';

  tbody.innerHTML = trades.map(t => {
    const ret      = calcReturnPct(t);
    const pnl      = calcPnlAmount(t);
    const dur      = calcDuration(t.entryDate, t.exitDate, t.entryTime, t.exitTime);
    const isWin    = ret !== null && ret > 0;
    const retClass = ret === null ? 'return-neutral' : isWin ? 'return-positive' : 'return-negative';

    const badge = ret === null ? '<span class="return-neutral">—</span>'
      : isWin
        ? '<span class="hist-badge hist-win">✅ רווח</span>'
        : '<span class="hist-badge hist-loss">❌ הפסד</span>';

    const pnlStr = pnl !== null
      ? `${pnl >= 0 ? '+' : '-'}$${fmt(Math.abs(pnl))}`
      : '—';

    const noteSnippet = t.tradeNote
      ? `<span class="hist-note-text" title="${escHtml(t.tradeNote)}">${escHtml(t.tradeNote.slice(0, 32))}${t.tradeNote.length > 32 ? '…' : ''}</span>`
      : '<span class="hist-note-empty">—</span>';

    return `<tr>
      <td><span class="ticker-cell">${escHtml(t.ticker)}</span></td>
      <td>${escHtml(t.sector || '—')}</td>
      <td>${fmtDatetime(t.entryDate, t.entryTime)}</td>
      <td>${fmtDatetime(t.exitDate, t.exitTime)}</td>
      <td>${dur ? `<span class="hist-duration">${dur}</span>` : '—'}</td>
      <td>$${fmt(t.entryPrice)}</td>
      <td>$${fmt(t.exitPrice)}</td>
      <td class="${retClass}">${pnlStr}</td>
      <td class="${retClass}">${fmtPct(ret)}</td>
      <td>${badge}</td>
      <td class="hist-note-cell">
        ${noteSnippet}
        <button class="btn-icon" onclick="openNoteModal('${t.id}')" title="ערוך הערה">✏️</button>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="openTradeModal('${t.id}')" title="עריכה">✏️</button>
          <button class="btn-icon btn-icon-del" onclick="confirmDeleteTrade('${t.id}')" title="מחיקה">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderHistSummary(trades) {
  const total    = trades.length;
  const wins     = trades.filter(t => (calcReturnPct(t) || 0) > 0).length;
  const winRate  = total > 0 ? (wins / total * 100).toFixed(1) : null;
  const totalPnl = trades.reduce((s, t) => s + (calcPnlAmount(t) || 0), 0);
  const durs     = trades.map(t => durationMs(t.entryDate, t.exitDate)).filter(d => d !== null);
  const avgDur   = durs.length ? durs.reduce((s, d) => s + d, 0) / durs.length : null;

  document.getElementById('hist-total').textContent = total;

  const wrEl = document.getElementById('hist-winrate');
  if (winRate !== null) {
    wrEl.textContent = winRate + '%';
    wrEl.style.color = parseFloat(winRate) >= 50 ? 'var(--green)' : 'var(--red)';
  } else {
    wrEl.textContent = '—';
    wrEl.style.color = '';
  }

  const pnlEl = document.getElementById('hist-total-pnl');
  if (total > 0) {
    pnlEl.textContent = (totalPnl >= 0 ? '+' : '') + '$' + fmt(Math.abs(totalPnl));
    pnlEl.style.color = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    pnlEl.textContent = '—';
    pnlEl.style.color = '';
  }

  document.getElementById('hist-avg-duration').textContent =
    avgDur !== null ? fmtDurationMs(avgDur) : '—';
}

/* ---- Note Modal ---- */
function openNoteModal(tradeId) {
  noteTradeId = tradeId;
  const trade = getTrades().find(t => t.id === tradeId);
  if (!trade) return;
  document.getElementById('note-modal-ticker').textContent = trade.ticker;
  document.getElementById('note-text').value = trade.tradeNote || '';
  const modal = document.getElementById('note-modal');
  modal.classList.add('open');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('note-text').focus(), 50);
}

function closeNoteModal() {
  const modal = document.getElementById('note-modal');
  modal.classList.remove('open');
  modal.style.display = 'none';
  noteTradeId = null;
}

function saveNote() {
  if (!noteTradeId) return;
  const text = document.getElementById('note-text').value.trim();
  updateTrade(noteTradeId, { tradeNote: text || null });
  closeNoteModal();
  renderHistory();
  showToast('הערה נשמרה ✓', 'success');
}
