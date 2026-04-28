/* ===== APP INIT & NAVIGATION ===== */

/* ---- Room Navigation ---- */
function switchRoom(roomId) {
  document.querySelectorAll('.room').forEach(r => r.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const room = document.getElementById('room-' + roomId);
  if (room) room.classList.add('active');

  const btn = document.querySelector(`.nav-item[data-room="${roomId}"]`);
  if (btn) btn.classList.add('active');

  if (roomId === 'portfolio')    renderPortfolio();
  if (roomId === 'lessons')     { renderAutoAnalysis(); renderLessons(); }
  if (roomId === 'investments') renderInvestments();
  if (roomId === 'history')     renderHistory();
}

/* ---- Toast ---- */
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast show' + (type ? ' ' + type : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

/* ---- Confirm Dialog ---- */
let confirmCallback = null;
function showConfirm(msg, onOk) {
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = onOk;
  const modal = document.getElementById('confirm-modal');
  modal.style.display = 'flex';
}
function closeConfirmModal() {
  document.getElementById('confirm-modal').style.display = 'none';
  confirmCallback = null;
}

/* ---- Keyboard ---- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeTradeModal();
    closeLessonModal();
    closeInvestmentModal();
    closeCloseTradeModal();
    closeNoteModal();
    closeConfirmModal();
  }
});

/* ---- Global refresh (used after import) ---- */
function refreshAllRooms() {
  renderTrades();
  renderPortfolio();
  renderAutoAnalysis();
  renderLessons();
  renderInvestments();
  renderHistory();
  updateTopbarStats();
  const activeRoom = document.querySelector('.room.active');
  if (!activeRoom) switchRoom('trades');
}

/* ---- Top Bar Clock ---- */
function updateTopbarClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const now  = new Date();
  const time = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  el.textContent = `${time}  |  ${date}`;
}

/* ---- Top Bar Stats ---- */
function updateTopbarStats() {
  const portfolioSize = getPortfolioSize();
  const trades        = getTrades();
  const openTrades    = trades.filter(t => t.status === 'open');

  // Total portfolio value
  const elPortfolio = document.getElementById('tb-portfolio');
  if (elPortfolio) {
    elPortfolio.textContent = portfolioSize > 0 ? '$' + fmt(portfolioSize, 0) : '—';
  }

  // Unrealized P&L
  const elPnl = document.getElementById('tb-pnl');
  if (elPnl) {
    const totalUnrealized = openTrades.reduce((sum, t) => {
      const pnl = calcUnrealizedPnl(t);
      return sum + (pnl || 0);
    }, 0);
    if (openTrades.some(t => t.currentPrice)) {
      const isPos = totalUnrealized >= 0;
      elPnl.textContent = (isPos ? '+' : '') + '$' + fmt(Math.abs(totalUnrealized), 0);
      elPnl.className   = 'topbar-stat-value ' + (isPos ? 'positive' : 'negative');
    } else {
      elPnl.textContent = '—';
      elPnl.className   = 'topbar-stat-value';
    }
  }

  // % Invested
  const elPct = document.getElementById('tb-invested-pct');
  if (elPct && portfolioSize > 0) {
    const invested = openTrades.reduce((s, t) => s + (parseFloat(t.entryAmount) || 0), 0);
    const pct = (invested / portfolioSize) * 100;
    elPct.textContent = pct.toFixed(1) + '%';
    elPct.className   = 'topbar-stat-value' + (pct > 90 ? ' negative' : pct > 60 ? ' positive' : '');
  } else if (elPct) {
    elPct.textContent = '—';
  }
}

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchRoom(btn.dataset.room));
  });

  // Confirm modal OK button
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    if (typeof confirmCallback === 'function') confirmCallback();
    closeConfirmModal();
  });

  // Top bar clock — tick every second
  updateTopbarClock();
  setInterval(updateTopbarClock, 1000);

  // Top bar stats — initial + refresh every 30s
  updateTopbarStats();
  setInterval(updateTopbarStats, 30000);

  // Initial render
  renderTrades();
  renderPortfolio();
});
