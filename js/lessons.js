/* ===== LESSONS ROOM ===== */

let editingLessonId = null;

/* ---- Auto Analysis ---- */
function renderAutoAnalysis() {
  const trades  = getTrades();
  const closed  = trades.filter(t => t.status === 'closed' && t.exitPrice && t.entryPrice);
  const container = document.getElementById('auto-analysis');

  if (!closed.length) {
    container.innerHTML = '<p class="empty-sub">אין עסקאות סגורות לניתוח עדיין.</p>';
    return;
  }

  // Win rate overall
  const wins    = closed.filter(t => calcReturnPct(t) > 0);
  const losses  = closed.filter(t => calcReturnPct(t) <= 0);
  const winRate = (wins.length / closed.length * 100).toFixed(1);

  // Average return
  const returns  = closed.map(t => calcReturnPct(t)).filter(r => r !== null);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;

  // Best / worst trades
  const sorted    = closed.slice().sort((a, b) => (calcReturnPct(b) || 0) - (calcReturnPct(a) || 0));
  const bestTrade = sorted[0];
  const worstTrade= sorted[sorted.length - 1];

  // Sector breakdown
  const sectorMap = {};
  closed.forEach(t => {
    const sec = t.sector || 'אחר';
    const ret = calcReturnPct(t) || 0;
    if (!sectorMap[sec]) sectorMap[sec] = { wins: 0, total: 0, sumRet: 0 };
    sectorMap[sec].total++;
    sectorMap[sec].sumRet += ret;
    if (ret > 0) sectorMap[sec].wins++;
  });

  const sectors     = Object.entries(sectorMap).sort((a,b) => b[1].sumRet - a[1].sumRet);
  const bestSector  = sectors[0];
  const worstSector = sectors[sectors.length - 1];

  // Duration analysis
  function avgDurDays(arr) {
    const valid = arr.filter(t => t.exitDate && t.entryDate);
    if (!valid.length) return null;
    const total = valid.reduce((s, t) => s + (new Date(t.exitDate) - new Date(t.entryDate)), 0);
    return (total / valid.length) / (1000 * 60 * 60 * 24);
  }
  const avgWinDur  = avgDurDays(wins);
  const avgLossDur = avgDurDays(losses);

  // Stop loss breaches
  const slBreaches = closed.filter(t => {
    if (!t.stopLoss || !t.exitPrice) return false;
    return parseFloat(t.exitPrice) < parseFloat(t.stopLoss);
  });

  // Monthly analysis
  const monthlyMap = {};
  closed.forEach(t => {
    const month = t.exitDate ? t.exitDate.slice(0,7) : 'לא ידוע';
    if (!monthlyMap[month]) monthlyMap[month] = { wins: 0, total: 0, sumRet: 0 };
    const ret = calcReturnPct(t) || 0;
    monthlyMap[month].total++;
    monthlyMap[month].sumRet += ret;
    if (ret > 0) monthlyMap[month].wins++;
  });

  const bestMonth = Object.entries(monthlyMap).sort((a,b) => b[1].sumRet - a[1].sumRet)[0];

  container.innerHTML = `
    <div class="analysis-stat">
      <div class="analysis-stat-label">Win Rate כולל</div>
      <div class="analysis-stat-value" style="color:${parseFloat(winRate)>=50?'var(--green)':'var(--red)'}">${winRate}%</div>
    </div>
    <div class="analysis-stat">
      <div class="analysis-stat-label">ממוצע תשואה</div>
      <div class="analysis-stat-value" style="color:${avgReturn>=0?'var(--green)':'var(--red)'}">${fmtPct(avgReturn)}</div>
    </div>
    <div class="analysis-stat">
      <div class="analysis-stat-label">עסקאות סגורות</div>
      <div class="analysis-stat-value">${closed.length}</div>
    </div>
    <div class="analysis-stat">
      <div class="analysis-stat-label">רצח / הפסד</div>
      <div class="analysis-stat-value"><span style="color:var(--green)">${wins.length}</span> / <span style="color:var(--red)">${losses.length}</span></div>
    </div>
    ${bestTrade ? `
    <div class="analysis-stat">
      <div class="analysis-stat-label">עסקה טובה ביותר</div>
      <div class="analysis-stat-value" style="color:var(--green)">${bestTrade.ticker} ${fmtPct(calcReturnPct(bestTrade))}</div>
    </div>` : ''}
    ${worstTrade ? `
    <div class="analysis-stat">
      <div class="analysis-stat-label">עסקה גרועה ביותר</div>
      <div class="analysis-stat-value" style="color:var(--red)">${worstTrade.ticker} ${fmtPct(calcReturnPct(worstTrade))}</div>
    </div>` : ''}
    ${bestSector ? `
    <div class="analysis-stat">
      <div class="analysis-stat-label">סקטור מוביל</div>
      <div class="analysis-stat-value" style="color:var(--green)">${bestSector[0]}</div>
    </div>` : ''}
    ${worstSector && worstSector[0] !== bestSector[0] ? `
    <div class="analysis-stat">
      <div class="analysis-stat-label">סקטור חלש</div>
      <div class="analysis-stat-value" style="color:var(--red)">${worstSector[0]}</div>
    </div>` : ''}
    ${bestMonth ? `
    <div class="analysis-stat">
      <div class="analysis-stat-label">חודש טוב ביותר</div>
      <div class="analysis-stat-value">${monthLabel(bestMonth[0])}</div>
    </div>` : ''}
    ${avgWinDur !== null ? `
    <div class="analysis-stat">
      <div class="analysis-stat-label">משך ממוצע — רווח</div>
      <div class="analysis-stat-value" style="color:var(--green)">${avgWinDur.toFixed(1)} ימים</div>
    </div>` : ''}
    ${avgLossDur !== null ? `
    <div class="analysis-stat">
      <div class="analysis-stat-label">משך ממוצע — הפסד</div>
      <div class="analysis-stat-value" style="color:var(--red)">${avgLossDur.toFixed(1)} ימים</div>
    </div>` : ''}
    <div class="analysis-stat">
      <div class="analysis-stat-label">חריגות מ-Stop Loss</div>
      <div class="analysis-stat-value" style="color:${slBreaches.length?'var(--red)':'var(--green)'}">${slBreaches.length} עסקאות</div>
    </div>

    ${buildInsights(closed, sectors, slBreaches, monthlyMap, avgWinDur, avgLossDur)}
  `;
}

function buildInsights(closed, sectors, slBreaches, monthlyMap, avgWinDur, avgLossDur) {
  const insights = [];

  // Sector pattern
  if (sectors.length > 1) {
    const worst = sectors[sectors.length - 1];
    const best  = sectors[0];
    if (worst[1].total >= 2 && worst[1].wins / worst[1].total < 0.4) {
      insights.push(`⚠️ ${worst[1].total} מתוך ${worst[1].total} עסקאות בסקטור "${worst[0]}" הסתיימו בהפסד. שקול להפחית חשיפה לסקטור זה.`);
    }
    if (best[1].total >= 2 && best[1].wins / best[1].total > 0.6) {
      insights.push(`✅ הסקטור "${best[0]}" מראה ביצועים עקביים — ${best[1].wins}/${best[1].total} עסקאות מוצלחות.`);
    }
  }

  // Duration insight
  if (avgWinDur !== null && avgLossDur !== null && avgLossDur > avgWinDur * 1.5) {
    insights.push(`📊 עסקאות מפסידות נמשכות בממוצע ${avgLossDur.toFixed(1)} ימים לעומת ${avgWinDur.toFixed(1)} ימים לעסקאות מרוויחות. שקול לקצר זמן עצירה בעסקאות שלא עובדות.`);
  }

  // SL pattern
  if (slBreaches.length >= 2) {
    insights.push(`⚠️ ${slBreaches.length} עסקאות נסגרו מתחת לרמת ה-Stop Loss המתוכננת. בדוק את משמעת ניהול הסיכונים.`);
  }

  // Monthly pattern
  const months = Object.values(monthlyMap);
  if (months.length >= 3) {
    const losingMonths = months.filter(m => m.sumRet < 0).length;
    if (losingMonths > months.length / 2) {
      insights.push(`📉 יותר ממחצית החודשים הסתיימו בתשואה שלילית. בחן את האסטרטגיה הכוללת.`);
    }
  }

  if (!insights.length) return '';

  return `<div class="analysis-insight">
    <div class="analysis-insight-title">תובנות ודפוסים</div>
    <div class="analysis-insight-body">${insights.join('<br>')}</div>
  </div>`;
}

/* ---- Personal Lessons ---- */
function renderLessons() {
  const lessons   = getLessons();
  const container = document.getElementById('lessons-list');

  if (!lessons.length) {
    container.innerHTML = '<p class="empty-sub" style="text-align:center;padding:1.5rem 0;">אין לקחים עדיין. לחץ "+ לקח חדש" להתחיל.</p>';
    return;
  }

  // Group by month
  const groups = {};
  lessons.forEach(l => {
    const key = l.month || (l.date ? l.date.slice(0,7) : 'כללי');
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });

  // Sort month keys descending
  const sortedKeys = Object.keys(groups).sort((a,b) => b.localeCompare(a));

  const allTrades = getTrades();
  container.innerHTML = sortedKeys.map(key => `
    <div class="month-group">
      <div class="month-label">${monthLabel(key)}</div>
      ${groups[key].map(l => {
        const linked = l.tradeId ? allTrades.find(t => t.id === l.tradeId) : null;
        return `
        <div class="lesson-card">
          <div class="lesson-card-header">
            <span class="lesson-card-title">${escHtml(l.title)}</span>
            <div class="lesson-card-actions">
              ${linked ? `<span class="lesson-trade-badge" onclick="switchRoom('history')" title="פתח בהיסטוריה">${escHtml(linked.ticker)}</span>` : ''}
              <span class="lesson-card-date">${fmtDate(l.date)}</span>
              <button class="btn-icon" onclick="openLessonModal('${l.id}')" title="עריכה">✏️</button>
              <button class="btn-icon btn-icon-del" onclick="confirmDeleteLesson('${l.id}')" title="מחיקה">🗑️</button>
            </div>
          </div>
          ${l.content ? `<div class="lesson-card-body">${escHtml(l.content)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  `).join('');
}

/* ---- Modal ---- */
function openLessonModal(id) {
  editingLessonId = id || null;
  const modal = document.getElementById('lesson-modal');
  const form  = document.getElementById('lesson-form');
  form.reset();

  // Populate closed-trades selector
  const tradeSelect = document.getElementById('l-trade-id');
  const closedTrades = getTrades().filter(t => t.status === 'closed');
  tradeSelect.innerHTML = '<option value="">— ללא קישור לעסקה —</option>' +
    closedTrades.map(t => `<option value="${t.id}">${escHtml(t.ticker)} — ${fmtDate(t.exitDate)}</option>`).join('');

  if (id) {
    const lesson = getLessons().find(l => l.id === id);
    if (!lesson) return;
    document.getElementById('lesson-modal-title').textContent = 'עריכת לקח';
    document.getElementById('l-date').value     = lesson.date    || '';
    document.getElementById('l-month').value    = lesson.month   || '';
    document.getElementById('l-title').value    = lesson.title   || '';
    document.getElementById('l-content').value  = lesson.content || '';
    tradeSelect.value = lesson.tradeId || '';
  } else {
    document.getElementById('lesson-modal-title').textContent = 'לקח חדש';
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('l-date').value  = today;
    document.getElementById('l-month').value = today.slice(0,7);
  }

  modal.classList.add('open');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('l-title').focus(), 50);
}

function closeLessonModal() {
  const modal = document.getElementById('lesson-modal');
  modal.classList.remove('open');
  modal.style.display = 'none';
  editingLessonId = null;
}

function saveLessonForm(e) {
  e.preventDefault();
  const data = {
    date:    document.getElementById('l-date').value,
    month:   document.getElementById('l-month').value,
    title:   document.getElementById('l-title').value.trim(),
    content: document.getElementById('l-content').value.trim(),
    tradeId: document.getElementById('l-trade-id').value || null,
  };

  if (editingLessonId) {
    updateLesson(editingLessonId, data);
    showToast('לקח עודכן ✓', 'success');
  } else {
    addLesson(data);
    showToast('לקח נוסף ✓', 'success');
  }

  closeLessonModal();
  renderLessons();
  renderAutoAnalysis();
}

/* ---- Delete ---- */
function confirmDeleteLesson(id) {
  const lesson = getLessons().find(l => l.id === id);
  if (!lesson) return;
  showConfirm(`למחוק את הלקח "${lesson.title}"?`, () => {
    deleteLesson(id);
    renderLessons();
    showToast('לקח נמחק', 'success');
  });
}
