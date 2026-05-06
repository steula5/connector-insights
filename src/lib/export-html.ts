import type { FamilyImage, HistoryData, SaleItem } from '@/types/sales';
import { MONTH_NAMES } from '@/types/sales';

interface ExportHtmlOptions {
  items: SaleItem[];
  history: HistoryData;
  familyImages: FamilyImage;
  selectedYear: string;
  selectedMonth: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildExportHtml({ items, history, familyImages, selectedYear, selectedMonth }: ExportHtmlOptions): string {
  const exportedAt = new Date().toLocaleString('pt-BR');

  // Build the years options dynamically based on history + current
  const historyYears = Array.from(new Set([selectedYear, ...Object.keys(history)])).sort().reverse();
  const yearOptions = historyYears.map(y => `<option value="${escapeHtml(y)}" ${y === selectedYear ? 'selected' : ''}>${escapeHtml(y)}</option>`).join('');
  const monthOptions = MONTH_NAMES.map((m, i) => `<option value="${i + 1}" ${String(i + 1) === selectedMonth ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Calculadora para Resumo de Vendas - Relatório Dinâmico</title>
  <!-- Tailwind-like custom styles for a fresh look -->
  <style>
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --panel: #ffffff;
      --line: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #0284c7;
      --primary-soft: #e0f2fe;
      --danger: #ef4444;
      --success: #10b981;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
    }
    .layout {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      min-height: 100vh;
    }
    .sidebar {
      border-right: 1px solid var(--line);
      background: var(--panel);
      padding: 24px 16px;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
      padding: 0 8px;
    }
    .brand-mark {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--primary);
      color: white;
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .brand-copy h1 { margin: 0; font-size: 1.1rem; }
    .brand-copy p { margin: 2px 0 0; color: var(--muted); font-size: 0.8rem; }
    
    .nav { display: grid; gap: 6px; }
    .nav button {
      width: 100%;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--muted);
      text-align: left;
      padding: 10px 16px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .nav button:hover { background: #f1f5f9; color: var(--text); }
    .nav button.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
    
    .sidebar-footer {
      margin-top: 32px;
      padding: 16px 8px 0;
      border-top: 1px solid var(--line);
      color: var(--text);
    }
    
    .content { padding: 32px 40px; }
    
    .page-header {
      margin-bottom: 24px;
    }
    .page-header h2 { margin: 0 0 8px; font-size: 1.8rem; }
    .page-header p { margin: 0; color: var(--muted); font-size: 0.95rem; }
    
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--shadow);
    }
    .metric-card span { display: block; color: var(--muted); font-size: 0.85rem; font-weight: 500; margin-bottom: 8px; }
    .metric-card strong { font-size: 1.7rem; font-weight: 700; color: var(--text); display: block; }
    .metric-card strong.negative { color: var(--danger); }
    .metric-sub { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
    .clickable-card { cursor: pointer; transition: all 0.2s; }
    .clickable-card:hover { transform: translateY(-2px); box-shadow: 0 8px 12px -2px rgba(0, 0, 0, 0.08); border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.02); }
    
    .section { display: none; animation: fade-in 0.2s ease; }
    .section.active { display: block; }
    
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 24px;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
    }
    .panel h3 { margin: 0 0 20px; font-size: 1.1rem; color: var(--text); }
    
    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }
    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
    }
    
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 12px 16px; border-bottom: 1px solid var(--line); text-align: left; }
    th { color: var(--muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; background: #f8fafc; }
    tr:hover td { background: #f1f5f9; }
    .negative { color: var(--danger); }
    
    .family-image, .family-placeholder { width: 32px; height: 32px; border-radius: 6px; object-fit: cover; }
    .family-placeholder { display: grid; place-items: center; background: #e2e8f0; color: var(--muted); font-weight: 600; font-size: 0.75rem; }
    
    .history-group + .history-group { margin-top: 24px; }
    .history-group h3 { margin: 0 0 16px; font-size: 1.1rem; }
    .history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .history-card { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 16px; text-align: center; }
    .history-card h4 { margin: 0 0 8px; font-size: 0.9rem; color: var(--muted); }
    .history-card strong { display: block; font-size: 1.2rem; }
    .history-card span { display: block; color: var(--muted); font-size: 0.8rem; margin-top: 4px; }
    
    dialog {
      border: none;
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 700px;
      width: 90%;
      max-height: 85vh;
      background: var(--panel);
      color: var(--text);
    }
    dialog::backdrop { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(2px); }
    .dialog-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dialog-header h3 { margin: 0; font-size: 1.2rem; }
    .dialog-close {
      background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--muted); line-height: 1; padding: 4px;
    }
    .dialog-close:hover { color: var(--text); }
    .dialog-body { padding: 0; overflow-y: auto; max-height: calc(85vh - 70px); }
    .dialog-body table th { position: sticky; top: 0; z-index: 10; }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--line); padding: 16px; }
      .brand { margin-bottom: 16px; }
      .nav { display: flex; flex-wrap: wrap; gap: 8px; }
      .nav button { width: auto; padding: 8px 12px; }
      .content { padding: 20px; }
      .chart-grid { grid-template-columns: 1fr; }
    }
  </style>
  
  <!-- Chart.js via CDN for rendering the charts -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">CI</div>
        <div class="brand-copy">
          <h1>Calculadora para Resumo de Vendas</h1>
          <p>Relatório Gerencial</p>
        </div>
      </div>
      <nav class="nav" aria-label="Seções do relatório">
        <button type="button" data-section="resumo" class="active">Resumo e Gráficos</button>
        <button type="button" data-section="detalhes">Relatório Detalhado</button>
        <button type="button" data-section="historico">Análise de Histórico</button>
      </nav>
      <div class="sidebar-footer">
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-size:0.8rem; margin-bottom:6px; font-weight:600;">Filtrar Período:</label>
          <div style="display:flex; gap:8px;">
            <select id="monthSelect" style="flex:1; padding:6px; border:1px solid var(--line); border-radius:6px; font-size:0.85rem; background: var(--bg); cursor: pointer;">
              ${monthOptions}
            </select>
            <select id="yearSelect" style="width:75px; padding:6px; border:1px solid var(--line); border-radius:6px; font-size:0.85rem; background: var(--bg); cursor: pointer;">
              ${yearOptions}
            </select>
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--muted); border-top: 1px solid var(--line); padding-top: 12px;"><strong>Exportado em:</strong><br/>${escapeHtml(exportedAt)}</div>
      </div>
    </aside>
    
    <main class="content">
      <div class="page-header">
        <h2 id="page-title">Mês e Ano</h2>
        <p>Visão geral de vendas e devoluções para o período selecionado.</p>
      </div>

      <div class="metrics">
        <article class="metric-card">
          <span>Total UN</span>
          <strong id="kpi-totalUN">0</strong>
        </article>
        <article id="kpi-returns-card" class="metric-card">
          <span>Devoluções <span id="kpi-returns-ver" style="display:none">(Ver)</span></span>
          <strong id="kpi-returns">0</strong>
          <div class="metric-sub" id="kpi-returns-un">0 UN devolvidas</div>
        </article>
        <article class="metric-card">
          <span>Item Top</span>
          <strong id="kpi-topcode">—</strong>
          <div class="metric-sub" id="kpi-topun">0 UN</div>
        </article>
        <article class="metric-card">
          <span>Média/Item</span>
          <strong id="kpi-avg">0</strong>
          <div class="metric-sub">UN por SKU</div>
        </article>
        <article class="metric-card">
          <span>Famílias</span>
          <strong id="kpi-families">0</strong>
        </article>
      </div>

      <!-- RESUMO & GRÁFICOS -->
      <section id="resumo" class="section active">
        <div class="chart-grid">
          <div class="panel">
            <h3>Top 10 Mais Vendidos</h3>
            <div class="chart-container"><canvas id="chart-top-items"></canvas></div>
          </div>
          <div class="panel">
            <h3>Vendas por Família</h3>
            <div class="chart-container"><canvas id="chart-family-bar"></canvas></div>
          </div>
          <div class="panel">
            <h3>Participação por Família (%)</h3>
            <div class="chart-container"><canvas id="chart-family-pie"></canvas></div>
          </div>
        </div>
      </section>

      <!-- DETALHES -->
      <section id="detalhes" class="section">
        <div class="panel table-wrap">
          <h3>Relatório de Itens Processados</h3>
          <table>
            <thead>
              <tr>
                <th>Img</th>
                <th>Código</th>
                <th>Família</th>
                <th>Unidade</th>
                <th>Qtd Origem</th>
                <th>QTY/BAG</th>
                <th>Total UN</th>
              </tr>
            </thead>
            <tbody id="table-details"></tbody>
          </table>
        </div>
      </section>

      <!-- HISTORICO -->
      <section id="historico" class="section">
        <div class="panel">
          <h3>Comparativo Mensal do Ano (<span id="history-year-label"></span>)</h3>
          <div class="chart-container" style="height: 350px;"><canvas id="chart-monthly"></canvas></div>
        </div>
        <div class="panel">
          <h3>Evolução dos Top 5 Itens (<span id="history-year-label-evo"></span>)</h3>
          <div class="chart-container" style="height: 350px;"><canvas id="chart-item-evo"></canvas></div>
        </div>
        <div class="panel">
          <h3>Totais Salvos (Todos os anos)</h3>
          <div id="history-panels"></div>
        </div>
      </section>
    </main>
  </div>

  <dialog id="modal-devolucoes">
    <div class="dialog-header">
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <h3>Itens Devolvidos (<span id="modal-returns-title"></span>)</h3>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="print-btn" onclick="printReturns()" style="padding: 6px 12px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 500; font-size: 0.85rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Baixar PDF
          </button>
          <button class="dialog-close" onclick="document.getElementById('modal-devolucoes').close()">&times;</button>
        </div>
      </div>
    </div>
    <div class="dialog-body table-wrap" id="returns-table-container">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Família</th>
            <th>Qtd Origem</th>
            <th>QTY/BAG</th>
            <th>Total UN</th>
          </tr>
        </thead>
        <tbody id="table-returns"></tbody>
      </table>
    </div>
  </dialog>

  <script>
    // Data injected from the app
    const APP_DATA = {
      items: ${JSON.stringify(items)},
      history: ${JSON.stringify(history)},
      familyImages: ${JSON.stringify(familyImages)},
      selectedYear: "${escapeHtml(selectedYear)}",
      selectedMonth: "${escapeHtml(selectedMonth)}",
      monthNames: ${JSON.stringify(MONTH_NAMES)}
    };

    // Navigation Logic
    (function () {
      const buttons = Array.from(document.querySelectorAll('[data-section]'));
      const sections = Array.from(document.querySelectorAll('.section'));

      function activate(sectionId) {
        buttons.forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-section') === sectionId));
        sections.forEach((sec) => sec.classList.toggle('active', sec.id === sectionId));
        window.location.hash = sectionId;
      }

      buttons.forEach((btn) => btn.addEventListener('click', () => activate(btn.getAttribute('data-section'))));
      const initialSection = window.location.hash.replace('#', '');
      if (buttons.some((btn) => btn.getAttribute('data-section') === initialSection)) {
        activate(initialSection);
      }
    })();

    // Dashboard Logic (Vanilla JS Reactivity)
    (function() {
      const formatNumber = (val) => val.toLocaleString('pt-BR');
      const escapeHtml = (str) => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
      
      let chartInstances = {};
      const primaryColor = '#0284c7';
      const secondaryColors = ['#0284c7', '#0d9488', '#8b5cf6', '#f59e0b', '#e11d48', '#0ea5e9', '#d97706', '#c026d3', '#16a34a', '#dc2626'];

      function renderDashboard() {
        const year = document.getElementById('yearSelect').value;
        const month = document.getElementById('monthSelect').value;
        const monthName = APP_DATA.monthNames[Number(month) - 1];

        // Ensure we load the correct items
        const isCurrent = year === APP_DATA.selectedYear && month === APP_DATA.selectedMonth;
        const monthHistory = APP_DATA.history[year] && APP_DATA.history[year][month];
        const items = isCurrent ? APP_DATA.items : (monthHistory ? monthHistory.items : []);

        document.getElementById('page-title').innerText = monthName + ' de ' + year;
        document.getElementById('history-year-label').innerText = year;
        document.getElementById('history-year-label-evo').innerText = year;
        document.getElementById('modal-returns-title').innerText = monthName + ' ' + year;

        // KPI Calculations
        const totalUN = items.reduce((sum, item) => sum + item.totalUN, 0);
        const returnedItems = items.filter(i => i.quantity < 0);
        const totalReturns = returnedItems.length;
        const totalReturnedUN = returnedItems.reduce((sum, i) => sum + Math.abs(i.totalUN), 0);
        const families = [...new Set(items.map(item => item.family))].sort();
        const sortedItems = [...items].sort((a, b) => b.totalUN - a.totalUN);
        const topCode = sortedItems.length ? sortedItems[0].code : '—';
        const topUN = sortedItems.length ? sortedItems[0].totalUN : 0;
        const avgPerItem = items.length ? Math.round(totalUN / items.length) : 0;

        // Update DOM KPIs
        document.getElementById('kpi-totalUN').innerText = formatNumber(totalUN);
        
        const returnsEl = document.getElementById('kpi-returns');
        returnsEl.innerText = totalReturns;
        returnsEl.className = totalReturns > 0 ? 'negative' : '';
        document.getElementById('kpi-returns-un').innerText = formatNumber(totalReturnedUN) + ' UN devolvidas';
        
        const returnsCard = document.getElementById('kpi-returns-card');
        returnsCard.className = 'metric-card' + (totalReturns > 0 ? ' clickable-card' : '');
        returnsCard.onclick = totalReturns > 0 ? () => document.getElementById('modal-devolucoes').showModal() : null;
        document.getElementById('kpi-returns-ver').style.display = totalReturns > 0 ? 'inline' : 'none';

        document.getElementById('kpi-topcode').innerText = escapeHtml(topCode);
        document.getElementById('kpi-topun').innerText = formatNumber(topUN) + ' UN';
        document.getElementById('kpi-avg').innerText = formatNumber(avgPerItem);
        document.getElementById('kpi-families').innerText = families.length;

        // Details Table
        const tbodyDetails = document.getElementById('table-details');
        if (items.length) {
          tbodyDetails.innerHTML = items.map(item => {
            const imgUrl = APP_DATA.familyImages[item.family];
            const img = imgUrl 
              ? \`<img class="family-image" src="\${escapeHtml(imgUrl)}" alt=""/>\` 
              : \`<div class="family-placeholder">\${escapeHtml(item.family.slice(0, 2).toUpperCase())}</div>\`;
            return \`<tr>
              <td>\${img}</td>
              <td>\${escapeHtml(item.code)}</td>
              <td>\${escapeHtml(item.family)}</td>
              <td>\${escapeHtml(item.unitOrigin)}</td>
              <td class="\${item.quantity < 0 ? 'negative' : ''}">\${formatNumber(item.quantity)}</td>
              <td>\${formatNumber(item.qtyPerBag)}</td>
              <td class="\${item.totalUN < 0 ? 'negative' : ''}"><strong>\${formatNumber(item.totalUN)}</strong></td>
            </tr>\`;
          }).join('');
        } else {
          tbodyDetails.innerHTML = '<tr><td colspan="7" class="empty-table" style="text-align:center; padding:30px;">Nenhum item processado neste mês.</td></tr>';
        }

        // Returns Table
        const tbodyReturns = document.getElementById('table-returns');
        if (returnedItems.length) {
          tbodyReturns.innerHTML = returnedItems.map(item => \`
            <tr>
              <td>\${escapeHtml(item.code)}</td>
              <td>\${escapeHtml(item.family)}</td>
              <td class="negative">\${formatNumber(item.quantity)}</td>
              <td>\${formatNumber(item.qtyPerBag)}</td>
              <td class="negative"><strong>\${formatNumber(item.totalUN)}</strong></td>
            </tr>
          \`).join('');
        } else {
          tbodyReturns.innerHTML = '<tr><td colspan="5" class="empty-table" style="text-align:center; padding:30px;">Nenhuma devolução.</td></tr>';
        }

        updateCharts(items, year, topCode !== '—' ? sortedItems.slice(0, 10) : []);
      }

      function updateCharts(items, currentYear, topItemsData) {
        if (typeof Chart === 'undefined') return; // Not connected to internet
        
        const fmt = (val) => val.toLocaleString('pt-BR') + ' UN';

        // 1. Top 10 Itens
        if (chartInstances.top) chartInstances.top.destroy();
        chartInstances.top = new Chart(document.getElementById('chart-top-items'), {
          type: 'bar',
          data: {
            labels: topItemsData.map(i => i.code),
            datasets: [{ label: 'Total UN', data: topItemsData.map(i => i.totalUN), backgroundColor: primaryColor, borderRadius: 4 }]
          },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmt(ctx.raw) } } } }
        });

        // Prepare Family Data
        const familyMap = new Map();
        items.forEach(i => familyMap.set(i.family, (familyMap.get(i.family) || 0) + i.totalUN));
        const familyArr = Array.from(familyMap, ([name, value]) => ({name, value})).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

        // 2. Vendas por Família
        if (chartInstances.familyBar) chartInstances.familyBar.destroy();
        chartInstances.familyBar = new Chart(document.getElementById('chart-family-bar'), {
          type: 'bar',
          data: {
            labels: familyArr.map(f => f.name),
            datasets: [{ label: 'Total UN', data: familyArr.map(f => f.value), backgroundColor: familyArr.map((_, i) => secondaryColors[i % secondaryColors.length]), borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmt(ctx.raw) } } } }
        });

        // 3. Participação Percentual por Família
        if (chartInstances.familyPie) chartInstances.familyPie.destroy();
        chartInstances.familyPie = new Chart(document.getElementById('chart-family-pie'), {
          type: 'doughnut',
          data: {
            labels: familyArr.map(f => f.name),
            datasets: [{ data: familyArr.map(f => f.value), backgroundColor: familyArr.map((_, i) => secondaryColors[i % secondaryColors.length]), borderWidth: 2 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (ctx) => ' ' + ctx.label + ': ' + fmt(ctx.raw) } } } }
        });

        // 4. Comparativo Mensal (Ano atual)
        const yearHistory = APP_DATA.history[currentYear] || {};
        const monthlyData = APP_DATA.monthNames.map((name, idx) => {
          const d = yearHistory[String(idx + 1)];
          // Only show historical totals, or if it's current month/year being viewed, show the active total
          if (currentYear === APP_DATA.selectedYear && String(idx + 1) === APP_DATA.selectedMonth) {
            return APP_DATA.items.reduce((sum, item) => sum + item.totalUN, 0);
          }
          return d ? d.totalUN : 0;
        });

        if (chartInstances.monthly) chartInstances.monthly.destroy();
        chartInstances.monthly = new Chart(document.getElementById('chart-monthly'), {
          type: 'bar',
          data: {
            labels: APP_DATA.monthNames.map(m => m.slice(0, 3)),
            datasets: [{ label: 'Total UN', data: monthlyData, backgroundColor: '#0d9488', borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmt(ctx.raw) } } } }
        });

        // 5. Evolução dos Top 5 Itens (Linha)
        const top5Codes = topItemsData.slice(0, 5).map(i => i.code);
        const evoDatasets = top5Codes.map((code, idx) => {
          const dataPoints = APP_DATA.monthNames.map((_, mIdx) => {
            const targetM = String(mIdx + 1);
            let mItems = [];
            if (currentYear === APP_DATA.selectedYear && targetM === APP_DATA.selectedMonth) {
              mItems = APP_DATA.items;
            } else {
              const mData = yearHistory[targetM];
              mItems = mData ? mData.items : [];
            }
            if (!mItems) return 0;
            const item = mItems.find(it => it.code === code);
            return item ? item.totalUN : 0;
          });
          return { label: code, data: dataPoints, borderColor: secondaryColors[idx], backgroundColor: secondaryColors[idx], tension: 0.3, borderWidth: 2, pointRadius: 3 };
        });

        if (chartInstances.itemEvo) chartInstances.itemEvo.destroy();
        chartInstances.itemEvo = new Chart(document.getElementById('chart-item-evo'), {
          type: 'line',
          data: { labels: APP_DATA.monthNames.map(m => m.slice(0, 3)), datasets: evoDatasets },
          options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fmt(ctx.raw) } } } }
        });
      }

      function renderHistoryPanels() {
        const historyYears = Object.entries(APP_DATA.history).sort((a,b) => b[0].localeCompare(a[0]));
        let html = '';
        if (!historyYears.length) {
          html = '<div class="empty-state" style="padding:20px; color:var(--muted);">Nenhum histórico salvo. Salve meses no dashboard primeiro.</div>';
        } else {
          html = historyYears.map(([y, months]) => {
            const monthCards = Object.entries(months).sort((a,b) => Number(a[0]) - Number(b[0])).map(([m, data]) => \`
              <article class="history-card" style="cursor:pointer" onclick="document.getElementById('yearSelect').value='\${y}'; document.getElementById('monthSelect').value='\${m}'; document.getElementById('monthSelect').dispatchEvent(new Event('change'));">
                <h4>\${escapeHtml(APP_DATA.monthNames[Number(m)-1] || m)}</h4>
                <strong class="\${data.totalUN < 0 ? 'negative' : ''}">\${formatNumber(data.totalUN)} UN</strong>
                <span>\${data.totalSKUs} SKUs</span>
              </article>
            \`).join('');
            return \`<section class="history-group"><h3>\${escapeHtml(y)}</h3><div class="history-grid">\${monthCards}</div></section>\`;
          }).join('');
        }
        document.getElementById('history-panels').innerHTML = html;
      }

      // Print PDF logic
      window.printReturns = function() {
        const year = document.getElementById('yearSelect').value;
        const month = document.getElementById('monthSelect').value;
        const monthName = APP_DATA.monthNames[Number(month) - 1];
        const tableHtml = document.getElementById('returns-table-container').innerHTML;
        const win = window.open('', '', 'width=900,height=650');
        win.document.write(\`
          <html>
            <head>
              <title>Devoluções - \${monthName} \${year}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; }
                h2 { margin-top: 0; font-size: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9rem; }
                th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                th { background-color: #f8fafc; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 0.8rem; }
                .negative { color: #dc2626; }
              </style>
            </head>
            <body>
              <h2>Relatório de Devoluções (\${monthName} \${year})</h2>
              \${tableHtml}
              <script>
                setTimeout(() => { window.print(); window.close(); }, 250);
              <\\/script>
            </body>
          </html>
        \`);
        win.document.close();
      };

      // Initialization
      renderHistoryPanels();
      
      const yearSelect = document.getElementById('yearSelect');
      const monthSelect = document.getElementById('monthSelect');
      
      yearSelect.addEventListener('change', renderDashboard);
      monthSelect.addEventListener('change', renderDashboard);

      // Add a slight delay for charts to load if they are coming from CDN async
      setTimeout(renderDashboard, 100);

    })();
  </script>
</body>
</html>`;
}