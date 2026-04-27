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
  const activeRoom = document.querySelector('.room.active');
  if (!activeRoom) switchRoom('trades');
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

  // Initial render
  renderTrades();
  renderPortfolio();
});
