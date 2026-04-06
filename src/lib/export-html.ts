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

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function buildHistoryRows(history: HistoryData): string {
  const years = Object.entries(history).sort(([a], [b]) => b.localeCompare(a));

  if (!years.length) {
    return '<div class="empty-state">Nenhum histórico salvo.</div>';
  }

  return years.map(([year, months]) => {
    const monthCards = Object.entries(months)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([month, data]) => `
        <article class="history-card">
          <h4>${escapeHtml(MONTH_NAMES[Number(month) - 1] ?? month)}</h4>
          <strong>${formatNumber(data.totalUN)} UN</strong>
          <span>${data.totalSKUs} SKUs</span>
        </article>
      `)
      .join('');

    return `
      <section class="history-group">
        <h3>${escapeHtml(year)}</h3>
        <div class="history-grid">${monthCards}</div>
      </section>
    `;
  }).join('');
}

export function buildExportHtml({ items, history, familyImages, selectedYear, selectedMonth }: ExportHtmlOptions): string {
  const totalUN = items.reduce((sum, item) => sum + item.totalUN, 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const families = [...new Set(items.map(item => item.family))].sort();
  const topItems = [...items].sort((a, b) => b.totalUN - a.totalUN).slice(0, 10);
  const familyTotals = Array.from(
    items.reduce((map, item) => {
      map.set(item.family, (map.get(item.family) ?? 0) + item.totalUN);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  const monthLabel = MONTH_NAMES[Number(selectedMonth) - 1] ?? selectedMonth;
  const exportedAt = new Date().toLocaleString('pt-BR');

  const summaryCards = [
    { label: 'Total UN', value: formatNumber(totalUN) },
    { label: 'Total Origem', value: formatNumber(totalQty) },
    { label: 'SKUs', value: formatNumber(items.length) },
    { label: 'Famílias', value: formatNumber(families.length) },
  ].map(card => `
    <article class="metric-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
    </article>
  `).join('');

  const topItemsRows = topItems.length
    ? topItems.map(item => `
        <tr>
          <td>${escapeHtml(item.code)}</td>
          <td>${escapeHtml(item.family)}</td>
          <td>${escapeHtml(item.unitOrigin)}</td>
          <td>${formatNumber(item.quantity)}</td>
          <td>${formatNumber(item.totalUN)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" class="empty-table">Nenhum item processado.</td></tr>';

  const detailedRows = items.length
    ? items.map(item => {
        const image = familyImages[item.family];
        const imageCell = image
          ? `<img class="family-image" src="${image}" alt="${escapeHtml(item.family)}" />`
          : `<div class="family-placeholder">${escapeHtml(item.family.slice(0, 2).toUpperCase())}</div>`;

        return `
          <tr>
            <td>${imageCell}</td>
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.family)}</td>
            <td>${escapeHtml(item.unitOrigin)}</td>
            <td>${formatNumber(item.quantity)}</td>
            <td>${formatNumber(item.qtyPerBag)}</td>
            <td>${formatNumber(item.totalUN)}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="7" class="empty-table">Nenhum item processado.</td></tr>';

  const familyRows = familyTotals.length
    ? familyTotals.map(([family, total]) => `
        <tr>
          <td>${escapeHtml(family)}</td>
          <td>${formatNumber(total)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" class="empty-table">Nenhuma família disponível.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ConnectorIQ - ${escapeHtml(monthLabel)} ${escapeHtml(selectedYear)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1e8;
      --panel: rgba(255, 252, 245, 0.9);
      --panel-strong: #fffaf0;
      --line: #d8c9a7;
      --text: #2d2418;
      --muted: #6f6250;
      --accent: #0f766e;
      --accent-strong: #134e4a;
      --accent-soft: rgba(15, 118, 110, 0.12);
      --danger: #b42318;
      --shadow: 0 18px 40px rgba(45, 36, 24, 0.12);
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 28%),
        linear-gradient(180deg, #f7f3ea 0%, var(--bg) 100%);
      color: var(--text);
    }
    .layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      min-height: 100vh;
    }
    .sidebar {
      border-right: 1px solid var(--line);
      background: rgba(255, 250, 240, 0.88);
      padding: 28px 20px;
      position: sticky;
      top: 0;
      height: 100vh;
      backdrop-filter: blur(14px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }
    .brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent) 0%, #d97706 100%);
      color: white;
      display: grid;
      place-items: center;
      font-weight: 700;
    }
    .brand-copy h1 {
      margin: 0;
      font-size: 1.1rem;
    }
    .brand-copy p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .nav {
      display: grid;
      gap: 10px;
    }
    .nav button {
      width: 100%;
      border: 1px solid transparent;
      border-radius: 14px;
      background: transparent;
      color: var(--text);
      text-align: left;
      padding: 12px 14px;
      font: inherit;
      cursor: pointer;
      transition: all 160ms ease;
    }
    .nav button:hover {
      background: rgba(255, 255, 255, 0.65);
      border-color: var(--line);
    }
    .nav button.active {
      background: var(--accent-soft);
      border-color: rgba(15, 118, 110, 0.28);
      color: var(--accent-strong);
      font-weight: 600;
    }
    .sidebar-footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.9rem;
    }
    .content {
      padding: 32px;
    }
    .hero {
      background: var(--panel);
      border: 1px solid rgba(216, 201, 167, 0.8);
      border-radius: 28px;
      padding: 28px;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
    }
    .hero h2 {
      margin: 0 0 8px;
      font-size: 2rem;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      max-width: 70ch;
      line-height: 1.6;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .metric-card, .panel {
      background: var(--panel);
      border: 1px solid rgba(216, 201, 167, 0.8);
      border-radius: 22px;
      box-shadow: var(--shadow);
    }
    .metric-card {
      padding: 18px 20px;
    }
    .metric-card span {
      display: block;
      color: var(--muted);
      font-size: 0.85rem;
      margin-bottom: 6px;
    }
    .metric-card strong {
      font-size: 1.6rem;
    }
    .section {
      display: none;
      animation: fade-in 180ms ease;
    }
    .section.active {
      display: block;
    }
    .section-stack {
      display: grid;
      gap: 20px;
    }
    .panel {
      padding: 22px;
    }
    .panel h3 {
      margin: 0 0 16px;
      font-size: 1.05rem;
    }
    .table-wrap {
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px 10px;
      border-bottom: 1px solid rgba(216, 201, 167, 0.7);
      text-align: left;
      vertical-align: middle;
    }
    th {
      color: var(--muted);
      font-size: 0.85rem;
      font-weight: 600;
    }
    .negative {
      color: var(--danger);
      font-weight: 700;
    }
    .family-image, .family-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      object-fit: cover;
    }
    .family-placeholder {
      display: grid;
      place-items: center;
      background: #ece3cf;
      color: var(--muted);
      font-weight: 700;
      font-size: 0.8rem;
    }
    .history-group + .history-group {
      margin-top: 20px;
    }
    .history-group h3 {
      margin: 0 0 12px;
    }
    .history-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .history-card {
      background: var(--panel-strong);
      border: 1px solid rgba(216, 201, 167, 0.8);
      border-radius: 18px;
      padding: 14px;
    }
    .history-card h4, .history-card strong, .history-card span {
      display: block;
    }
    .history-card h4 {
      margin: 0 0 8px;
      font-size: 0.95rem;
    }
    .history-card span {
      color: var(--muted);
      margin-top: 6px;
      font-size: 0.85rem;
    }
    .empty-table, .empty-state {
      color: var(--muted);
      text-align: center;
      padding: 24px;
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 980px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position: static;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }
      .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .content {
        padding: 20px;
      }
    }
    @media (max-width: 640px) {
      .metrics {
        grid-template-columns: 1fr;
      }
      .hero h2 {
        font-size: 1.55rem;
      }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">CI</div>
        <div class="brand-copy">
          <h1>ConnectorIQ</h1>
          <p>Relatório exportado</p>
        </div>
      </div>
      <nav class="nav" aria-label="Seções do relatório">
        <button type="button" data-section="resumo" class="active">Resumo</button>
        <button type="button" data-section="top-itens">Top Itens</button>
        <button type="button" data-section="familias">Famílias</button>
        <button type="button" data-section="detalhes">Detalhes</button>
        <button type="button" data-section="historico">Histórico</button>
      </nav>
      <div class="sidebar-footer">
        <div><strong>Período:</strong> ${escapeHtml(monthLabel)} ${escapeHtml(selectedYear)}</div>
        <div><strong>Exportado:</strong> ${escapeHtml(exportedAt)}</div>
      </div>
    </aside>
    <main class="content">
      <section class="hero">
        <h2>${escapeHtml(monthLabel)} ${escapeHtml(selectedYear)}</h2>
        <p>
          Este HTML é um relatório autônomo. A navegação lateral funciona sem depender do app original,
          então você pode abrir o arquivo localmente e alternar entre resumo, itens, famílias, detalhes e histórico.
        </p>
        <div class="metrics">${summaryCards}</div>
      </section>

      <section id="resumo" class="section active">
        <div class="section-stack">
          <article class="panel">
            <h3>Visão geral</h3>
            <p>Total líquido do mês: <strong>${formatNumber(totalUN)} UN</strong>.</p>
            <p>O total de origem considera também quantidades negativas, tratando devoluções como abatimento do mês.</p>
          </article>
        </div>
      </section>

      <section id="top-itens" class="section">
        <div class="panel table-wrap">
          <h3>Top itens por Total UN</h3>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Família</th>
                <th>Unidade</th>
                <th>Qtd Origem</th>
                <th>Total UN</th>
              </tr>
            </thead>
            <tbody>${topItemsRows}</tbody>
          </table>
        </div>
      </section>

      <section id="familias" class="section">
        <div class="panel table-wrap">
          <h3>Participação por família</h3>
          <table>
            <thead>
              <tr>
                <th>Família</th>
                <th>Total UN</th>
              </tr>
            </thead>
            <tbody>${familyRows}</tbody>
          </table>
        </div>
      </section>

      <section id="detalhes" class="section">
        <div class="panel table-wrap">
          <h3>Relatório detalhado</h3>
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
            <tbody>${detailedRows}</tbody>
          </table>
        </div>
      </section>

      <section id="historico" class="section">
        <div class="panel">
          <h3>Histórico salvo</h3>
          ${buildHistoryRows(history)}
        </div>
      </section>
    </main>
  </div>

  <script>
    (function () {
      const buttons = Array.from(document.querySelectorAll('[data-section]'));
      const sections = Array.from(document.querySelectorAll('.section'));

      function activate(sectionId) {
        buttons.forEach((button) => {
          button.classList.toggle('active', button.getAttribute('data-section') === sectionId);
        });
        sections.forEach((section) => {
          section.classList.toggle('active', section.id === sectionId);
        });
        window.location.hash = sectionId;
      }

      buttons.forEach((button) => {
        button.addEventListener('click', function () {
          activate(button.getAttribute('data-section'));
        });
      });

      const initialSection = window.location.hash.replace('#', '');
      const hasInitial = buttons.some((button) => button.getAttribute('data-section') === initialSection);
      activate(hasInitial ? initialSection : 'resumo');
    })();
  </script>
</body>
</html>`;
}