/* ===== DATA LAYER — localStorage ===== */

const STORAGE_KEYS = {
  trades:        'tj_trades',
  lessons:       'tj_lessons',
  portfolioSize: 'tj_portfolio_size',
  seeded:        'tj_seeded_v1',
};

/* ---------- Initial Seed (runs once per browser) ---------- */
function seedInitialData() {
  if (localStorage.getItem(STORAGE_KEYS.seeded)) return;

  const initialTrades = [
    {
      id: 'trade_001',
      ticker: 'MSFT',
      sector: 'טכנולוגיה',
      entryDate: '2026-04-16',
      entryPrice: 409.64,
      entryAmount: 2458.00,
      stopLoss: null,
      entryReason: "תחילת סטייג' 2 + וליום",
      exitDate: null,
      exitPrice: null,
      currentPrice: null,
      status: 'open',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'trade_002',
      ticker: 'MSFT',
      sector: 'טכנולוגיה',
      entryDate: '2026-04-24',
      entryPrice: 424.37,
      entryAmount: 2546.00,
      stopLoss: null,
      entryReason: 'חיזוק פוזיציה',
      exitDate: null,
      exitPrice: null,
      currentPrice: null,
      status: 'open',
      createdAt: new Date().toISOString(),
    },
  ];

  if (!localStorage.getItem(STORAGE_KEYS.trades)) {
    localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(initialTrades));
  }
  if (!localStorage.getItem(STORAGE_KEYS.portfolioSize)) {
    localStorage.setItem(STORAGE_KEYS.portfolioSize, '9722');
  }
  localStorage.setItem(STORAGE_KEYS.seeded, '1');
}

seedInitialData();

/* ---------- Trades ---------- */
function getTrades() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.trades)) || []; }
  catch { return []; }
}

function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(trades));
}

function addTrade(trade) {
  const trades = getTrades();
  trade.id = Date.now().toString();
  trade.createdAt = new Date().toISOString();
  trades.push(trade);
  saveTrades(trades);
  return trade;
}

function updateTrade(id, updates) {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return false;
  trades[idx] = { ...trades[idx], ...updates, updatedAt: new Date().toISOString() };
  saveTrades(trades);
  return trades[idx];
}

function deleteTrade(id) {
  const trades = getTrades().filter(t => t.id !== id);
  saveTrades(trades);
}

/* ---------- Lessons ---------- */
function getLessons() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.lessons)) || []; }
  catch { return []; }
}

function saveLessons(lessons) {
  localStorage.setItem(STORAGE_KEYS.lessons, JSON.stringify(lessons));
}

function addLesson(lesson) {
  const lessons = getLessons();
  lesson.id = Date.now().toString();
  lesson.createdAt = new Date().toISOString();
  lessons.push(lesson);
  saveLessons(lessons);
  return lesson;
}

function updateLesson(id, updates) {
  const lessons = getLessons();
  const idx = lessons.findIndex(l => l.id === id);
  if (idx === -1) return false;
  lessons[idx] = { ...lessons[idx], ...updates };
  saveLessons(lessons);
  return lessons[idx];
}

function deleteLesson(id) {
  saveLessons(getLessons().filter(l => l.id !== id));
}

/* ---------- Portfolio Size ---------- */
function getPortfolioSize() {
  return parseFloat(localStorage.getItem(STORAGE_KEYS.portfolioSize)) || 0;
}

function savePortfolioSize(size) {
  localStorage.setItem(STORAGE_KEYS.portfolioSize, String(parseFloat(size) || 0));
}

/* ---------- Export / Import ---------- */
function exportJSON() {
  const data = {
    version:       2,
    exportedAt:    new Date().toISOString(),
    trades:        getTrades(),
    lessons:       getLessons(),
    portfolioSize: getPortfolioSize(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = `trading-journal-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('נתונים יוצאו בהצלחה ✓', 'success');
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.trades)        saveTrades(data.trades);
      if (data.lessons)       saveLessons(data.lessons);
      if (data.portfolioSize) savePortfolioSize(data.portfolioSize);
      showToast('נתונים יובאו בהצלחה ✓', 'success');
      refreshAllRooms();
    } catch {
      showToast('שגיאה בקובץ JSON', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* ---------- Computed helpers ---------- */
function calcReturnPct(trade) {
  if (!trade.exitPrice || !trade.entryPrice) return null;
  return ((parseFloat(trade.exitPrice) - parseFloat(trade.entryPrice)) / parseFloat(trade.entryPrice)) * 100;
}

function calcPortfolioPct(trade, portfolioSize) {
  if (!portfolioSize || !trade.entryAmount) return null;
  return (parseFloat(trade.entryAmount) / portfolioSize) * 100;
}

function calcUnrealizedPnl(trade) {
  if (!trade.currentPrice || !trade.entryPrice || !trade.entryAmount) return null;
  const shares   = parseFloat(trade.entryAmount) / parseFloat(trade.entryPrice);
  const current  = shares * parseFloat(trade.currentPrice);
  return current - parseFloat(trade.entryAmount);
}

function fmt(n, decimals = 2, prefix = '') {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return prefix + parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function monthLabel(monthStr) {
  if (!monthStr) return 'ללא חודש';
  const [y, m] = monthStr.split('-');
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${months[parseInt(m,10)-1]} ${y}`;
}
