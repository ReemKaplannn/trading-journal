/* ===== PORTFOLIO ROOM ===== */

let portfolioChartInstance = null;

function renderPortfolio() {
  const trades      = getTrades().filter(t => t.status === 'open');
  const portSize    = getPortfolioSize();

  // Sync input field
  const sizeInput = document.getElementById('portfolio-size-input');
  if (sizeInput && portSize) sizeInput.value = portSize;

  const totalInvested = trades.reduce((s, t) => s + (parseFloat(t.entryAmount) || 0), 0);
  const cash          = Math.max(portSize - totalInvested, 0);
  const investedPct   = portSize > 0 ? (totalInvested / portSize) * 100 : 0;

  // Unrealized P&L
  let totalUnrealized = 0;
  trades.forEach(t => {
    const pnl = calcUnrealizedPnl(t);
    if (pnl !== null) totalUnrealized += pnl;
  });

  // Stats
  document.getElementById('stat-invested').textContent     = '$' + fmt(totalInvested);
  document.getElementById('stat-cash').textContent         = '$' + fmt(cash);
  document.getElementById('stat-invested-pct').textContent = investedPct.toFixed(1) + '%';

  const unrealEl = document.getElementById('stat-unrealized');
  unrealEl.textContent = (totalUnrealized >= 0 ? '+' : '') + '$' + fmt(Math.abs(totalUnrealized));
  unrealEl.style.color = totalUnrealized >= 0 ? 'var(--green)' : 'var(--red)';

  // Open trades list
  renderOpenTradesList(trades, portSize);

  // Chart
  renderPortfolioChart(trades, portSize, cash);
}

function renderOpenTradesList(trades, portSize) {
  const container = document.getElementById('open-trades-list');
  if (!trades.length) {
    container.innerHTML = '<p class="empty-sub" style="text-align:center;padding:1.5rem 0;">אין עסקאות פתוחות</p>';
    return;
  }

  container.innerHTML = trades.map(t => {
    const portPct = portSize > 0 ? ((parseFloat(t.entryAmount) || 0) / portSize * 100).toFixed(1) : '—';
    const pnl     = calcUnrealizedPnl(t);
    const pnlStr  = pnl !== null
      ? `<span class="otc-pnl" style="color:${pnl >= 0 ? 'var(--green)' : 'var(--red)'}">${pnl >= 0 ? '+' : ''}$${fmt(Math.abs(pnl))}</span>`
      : '<span class="otc-pnl" style="color:var(--text-muted)">אין מחיר נוכחי</span>';

    return `<div class="open-trade-card">
      <div class="otc-left">
        <span class="otc-ticker">${escHtml(t.ticker)}</span>
        <span class="otc-meta">${escHtml(t.sector || '')} · ${fmtDate(t.entryDate)}</span>
      </div>
      <div class="otc-right">
        <span class="otc-pct">${portPct !== '—' ? portPct + '%' : '—'} מהתיק</span>
        ${pnlStr}
      </div>
    </div>`;
  }).join('');
}

function renderPortfolioChart(trades, portSize, cash) {
  const canvas   = document.getElementById('portfolio-chart');
  const emptyMsg = document.getElementById('chart-empty-msg');

  if (!trades.length && cash === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    canvas.style.display = 'none';
    if (portfolioChartInstance) { portfolioChartInstance.destroy(); portfolioChartInstance = null; }
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  canvas.style.display = 'block';

  const labels = trades.map(t => t.ticker);
  const values = trades.map(t => parseFloat(t.entryAmount) || 0);
  const colors = [
    '#38bdf8','#22c55e','#f59e0b','#a78bfa','#fb7185',
    '#34d399','#60a5fa','#fbbf24','#c084fc','#f87171',
    '#2dd4bf','#818cf8',
  ];

  if (cash > 0) { labels.push('מזומן'); values.push(cash); }

  const chartColors = labels.map((_, i) => {
    if (i === labels.length - 1 && cash > 0) return '#64748b';
    return colors[i % colors.length];
  });

  if (portfolioChartInstance) portfolioChartInstance.destroy();

  portfolioChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: chartColors,
        borderColor: '#1c2230',
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { family: 'Heebo', size: 12 },
            padding: 12,
            boxWidth: 12,
            boxHeight: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` $${fmt(ctx.parsed)} (${pct}%)`;
            },
          },
          bodyFont: { family: 'Heebo' },
          titleFont: { family: 'Heebo' },
          backgroundColor: '#1c2230',
          borderColor: '#30384a',
          borderWidth: 1,
        },
      },
    },
  });
}

function updatePortfolioSize(value) {
  const size = parseFloat(value) || 0;
  savePortfolioSize(size);
  renderPortfolio();
}
