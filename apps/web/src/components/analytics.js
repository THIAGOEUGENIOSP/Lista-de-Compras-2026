import { brl } from "../utils/format.js";

function insightCard({ icon, title, value, sub, items = [], emptyText = "Nenhum encontrado", variant = "" }) {
  const listHtml = items.length
    ? `<ul class="insight-list">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`
    : `<div class="insight-empty">${emptyText}</div>`;

  return `
  <div class="insight-card ${variant ? `insight-${variant}` : ""}">
    <div class="insight-top">
      <span class="insight-icon">${icon}</span>
      <div class="insight-meta">
        <div class="insight-title">${title}</div>
        ${value ? `<div class="insight-value">${value}</div>` : ""}
      </div>
      ${sub ? `<div class="insight-sub-badge">${sub}</div>` : ""}
    </div>
    ${listHtml}
  </div>`;
}

export function renderAnalytics(insights) {
  const agent = insights || {};
  const wasteItems   = agent.wasteItems  || [];
  const priceyItems  = agent.priceyItems || [];
  const dupes        = agent.duplicates    || [];
  const zeroPrice    = agent.zeroPrice     || [];
  const topByCount   = (agent.topBoughtByCount || []).slice(0, 6);
  const topByValue   = (agent.topBoughtByValue || []).slice(0, 6);
  const tips         = agent.tips          || [];

  const wastePct     = agent.wastePct || 0;
  const wastePctVariant = wastePct >= 20 ? "danger" : wastePct >= 10 ? "warn" : "ok";

  return `
  <div class="card analytics-card" style="margin-top:12px">

    <!-- Cabeçalho -->
    <div class="analytics-header">
      <div>
        <h2>📊 Analytics</h2>
        <div class="muted" style="font-size:12px;margin-top:3px">Insights automáticos, gráficos, comparativos e Consultor IA</div>
      </div>
    </div>

    <!-- IA Advisor -->
    <div class="ai-advisor">
      <div class="ai-advisor-top">
        <div class="ai-info">
          <div class="ai-labels-row">
            <span class="ai-badge-pill">✨ Groq IA</span>
            <span class="ai-model-tag">llama-3.1-8b-instant</span>
          </div>
          <div class="ai-title">Consultor de Economia</div>
          <div class="ai-desc">Analisa sua lista e sugere onde economizar com inteligência artificial</div>
        </div>
        <button class="btn primary ai-analyze-btn" data-action="analyze-ai">
          ✨ Analisar lista
        </button>
      </div>

      <!-- Área de resposta da IA -->
      <div id="ai-response" class="ai-response"></div>

      <!-- Chave local (aparece só quando proxy falha) -->
      <div id="ai-key-section" class="ai-key-section" style="display:none">
        <div class="ai-key-label">🔑 Chave API Groq (uso local)</div>
        <div class="ai-key-row">
          <input id="ai-key-input" type="password" class="ai-key-input"
            placeholder="gsk_..." autocomplete="off" spellcheck="false" />
          <button class="btn primary small" data-action="save-groq-key">Salvar</button>
          <button class="btn small" data-action="clear-groq-key">Limpar</button>
        </div>
        <div class="ai-key-hint">
          Crie uma chave gratuita em <strong>console.groq.com</strong>. Fica salva só no seu navegador.
        </div>
      </div>
    </div>

    <div class="hr" style="margin:16px 0"></div>

    <!-- Gráficos -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-card-label">💰 Distribuição de preços</div>
        <div class="chart-card-sub">Quantidade de itens por faixa de valor unitário</div>
        <div class="chart-box"><canvas id="chartPrice"></canvas></div>
        <div class="chart-insight">
          <span class="chart-insight-icon">📊</span>
          <span class="chart-insight-text">Clique nas barras para ver detalhes</span>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card-label">🏷️ Gastos por categoria</div>
        <div class="chart-card-sub">Distribuição do valor comprado por categoria</div>
        <div class="chart-box"><canvas id="chartCategory"></canvas></div>
        <div class="chart-insight">
          <span class="chart-insight-icon">📍</span>
          <span class="chart-insight-text" id="chart-category-insight">Carregando…</span>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card-label">🍩 Pendentes vs Comprados</div>
        <div class="chart-card-sub">Proporção de itens pendentes vs comprados</div>
        <div class="chart-box"><canvas id="chartStatus"></canvas></div>
        <div class="chart-insight">
          <span class="chart-insight-icon">🎯</span>
          <span class="chart-insight-text">Meta: 100% dos itens comprados</span>
        </div>
      </div>

      <div class="chart-card chart-card-wide">
        <div class="chart-card-label">📈 Evolução mensal</div>
        <div class="chart-card-sub">Histórico de gastos e quantidade de itens nos últimos 6 meses</div>
        <div class="chart-box chart-box-split">
          <div class="chart-half"><canvas id="chartMonthlySpent"></canvas></div>
          <div class="chart-half"><canvas id="chartMonthlyCount"></canvas></div>
        </div>
        <div class="chart-insight">
          <span class="chart-insight-icon">📉</span>
          <span class="chart-insight-text" id="chart-monthly-insight">Compare seus gastos ao longo do tempo</span>
        </div>
      </div>
    </div>

    <div class="hr" style="margin:16px 0"></div>

    <!-- Comparativo Mensal -->
    <details class="section-collapsible" open>
      <summary>
        <span class="sc-title">📅 Comparativo Mensal</span>
        <span class="sc-sub">Gastos por categoria — mês atual vs mês anterior</span>
      </summary>
      <div id="monthly-comparison" style="margin-top:14px">
        <div class="comparison-loading">
          <div class="comparison-skel"></div>
          <div class="comparison-skel" style="--w:80%"></div>
          <div class="comparison-skel" style="--w:60%"></div>
        </div>
      </div>
    </details>

    <div class="hr" style="margin:16px 0"></div>

    <!-- Itens mais frequentes (colapsável) -->
    <details class="section-collapsible" open>
      <summary>
        <span class="sc-title">🏆 Itens mais frequentes</span>
        <span class="sc-sub">Compras recorrentes — meses anteriores + mês atual</span>
      </summary>
      <div id="top-items-history" class="top-items-loading" style="margin-top:14px">
        <div class="top-items-skeleton">
          ${[100,80,65,55,45].map(w => `<div class="top-item-skel" style="--w:${w}%"></div>`).join("")}
        </div>
      </div>
    </details>

    <div class="hr" style="margin:16px 0"></div>

    <!-- Agente Econômico -->
    <div>
      <h3 style="margin-bottom:14px;font-size:14px;letter-spacing:-.01em">🔍 Agente Econômico</h3>

      <div class="insights-grid">
        ${insightCard({
          icon: "🗑️",
          title: "Supérfluos",
          value: agent.wasteTotalLabel || "R$ 0,00",
          sub: `<span class="pct-badge pct-${wastePctVariant}">${agent.wastePctLabel || "0%"}</span>`,
          items: wasteItems,
          emptyText: "Nenhum item supérfluo",
          variant: "warn",
        })}

        ${insightCard({
          icon: "💸",
          title: "Itens acima da média",
          value: null,
          sub: null,
          items: priceyItems,
          emptyText: "Nenhum item caro detectado",
          variant: "danger",
        })}

        ${insightCard({
          icon: "♻️",
          title: "Duplicados",
          value: null,
          sub: dupes.length ? `<span class="pct-badge pct-warn">${dupes.length} item(s)</span>` : null,
          items: dupes,
          emptyText: "Nenhum duplicado encontrado",
          variant: "info",
        })}

        ${insightCard({
          icon: "🏆",
          title: "Top comprados (freq.)",
          value: null,
          sub: null,
          items: topByCount,
          emptyText: "Sem dados suficientes",
          variant: "",
        })}

        ${insightCard({
          icon: "💰",
          title: "Top comprados (valor)",
          value: null,
          sub: null,
          items: topByValue,
          emptyText: "Sem dados suficientes",
          variant: "",
        })}

        ${zeroPrice.length ? insightCard({
          icon: "⚠️",
          title: "Sem preço definido",
          value: null,
          sub: `<span class="pct-badge pct-warn">${zeroPrice.length} item(s)</span>`,
          items: zeroPrice,
          emptyText: "",
          variant: "warn",
        }) : ""}
      </div>

      ${tips.length ? `
      <div class="tips-section">
        <div class="tips-title">💡 Dicas para economizar</div>
        <div class="tips-list">
          ${tips.map((t) => `<div class="tip-item"><span class="tip-dot"></span><span>${t}</span></div>`).join("")}
        </div>
      </div>` : ""}
    </div>

  </div>
  `;
}

/* ---- Comparison table renderer ---- */
export function renderMonthComparisonTable(monthlySeries) {
  const bd = monthlySeries.categoryBreakdown || [];
  if (bd.length < 2) {
    return `<div class="insight-empty" style="padding:16px 0">Dados insuficientes para comparação (precisa de pelo menos 2 meses).</div>`;
  }

  const prev = bd[bd.length - 2];
  const curr = bd[bd.length - 1];

  const allCats = new Set([
    ...Object.keys(prev.categories || {}),
    ...Object.keys(curr.categories || {}),
  ]);

  const rows = Array.from(allCats).map((cat) => {
    const pVal = prev.categories[cat] || 0;
    const cVal = curr.categories[cat] || 0;
    const delta = pVal === 0 ? null : ((cVal - pVal) / pVal) * 100;
    return { cat, pVal, cVal, delta };
  }).sort((a, b) => b.cVal - a.cVal);

  const totalPrev = rows.reduce((s, r) => s + r.pVal, 0);
  const totalCurr = rows.reduce((s, r) => s + r.cVal, 0);
  const totalDelta = totalPrev === 0 ? null : ((totalCurr - totalPrev) / totalPrev) * 100;

  const deltaCell = (delta, cVal, pVal) => {
    if (delta === null && pVal === 0 && cVal > 0) {
      return `<span class="comp-delta comp-new">✨ Novo</span>`;
    }
    if (delta === null) return `<span class="comp-delta comp-neutral">—</span>`;
    const sign = delta >= 0 ? "+" : "";
    const cls = delta > 5 ? "comp-up" : delta < -5 ? "comp-down" : "comp-neutral";
    const arrow = delta > 5 ? "↑" : delta < -5 ? "↓" : "→";
    return `<span class="comp-delta ${cls}">${arrow} ${sign}${delta.toFixed(1)}%</span>`;
  };

  const catEmoji = {
    "Limpeza e Higiene": "🧽",
    "Padaria e Laticínios": "🥖",
    "Bebidas": "🥤",
    "Proteínas e Ovos": "🥚",
    "Geral": "📦",
    "Churrasco": "🔥",
  };

  const tableRows = rows.filter(r => r.pVal > 0 || r.cVal > 0).map(({ cat, pVal, cVal, delta }) => `
    <tr>
      <td class="comp-cat-cell">
        <span class="comp-cat-emoji">${catEmoji[cat] || "📦"}</span>
        <span class="comp-cat-name">${cat}</span>
      </td>
      <td class="comp-val-cell">${brl(pVal)}</td>
      <td class="comp-val-cell comp-curr">${brl(cVal)}</td>
      <td class="comp-delta-cell">${deltaCell(delta, cVal, pVal)}</td>
    </tr>
  `).join("");

  const totalDeltaHtml = deltaCell(totalDelta, totalCurr, totalPrev);

  // Insight text
  let insightText = "";
  if (totalDelta !== null) {
    if (totalDelta > 10) {
      insightText = `⚠️ Gastos aumentaram <strong>${totalDelta.toFixed(1)}%</strong> vs ${prev.label}. Revise categorias em vermelho.`;
    } else if (totalDelta < -10) {
      insightText = `✅ Ótimo! Gastos reduziram <strong>${Math.abs(totalDelta).toFixed(1)}%</strong> vs ${prev.label}. Continue assim!`;
    } else {
      insightText = `ℹ️ Gastos estáveis em relação a ${prev.label} (${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(1)}%).`;
    }
  }

  // Top increases
  const topIncreases = rows.filter(r => r.delta !== null && r.delta > 10 && r.cVal > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2);
  const topDecreases = rows.filter(r => r.delta !== null && r.delta < -10)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2);

  return `
  <div class="comp-insight-box">
    <div class="comp-insight-text">${insightText}</div>
    ${topIncreases.length ? `<div class="comp-mini-tips">
      ${topIncreases.map(r => `<span class="comp-mini-tip comp-mini-up">↑ ${r.cat}: +${r.delta.toFixed(0)}%</span>`).join("")}
      ${topDecreases.map(r => `<span class="comp-mini-tip comp-mini-down">↓ ${r.cat}: ${r.delta.toFixed(0)}%</span>`).join("")}
    </div>` : ""}
  </div>
  <div class="comparison-table-wrap">
    <table class="comparison-table">
      <thead>
        <tr>
          <th class="comp-cat-head">Categoria</th>
          <th class="comp-val-head">${prev.label}</th>
          <th class="comp-val-head comp-curr-head">${curr.label}</th>
          <th class="comp-delta-head">Variação</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr class="comp-total-row">
          <td class="comp-cat-cell"><span class="comp-cat-emoji">💰</span><strong>Total</strong></td>
          <td class="comp-val-cell"><strong>${brl(totalPrev)}</strong></td>
          <td class="comp-val-cell comp-curr"><strong>${brl(totalCurr)}</strong></td>
          <td class="comp-delta-cell">${totalDeltaHtml}</td>
        </tr>
      </tbody>
    </table>
  </div>
  `;
}

/* ---- KPI trend badges ---- */
export function updateKPITrends(monthlySeries) {
  const n = monthlySeries.values?.length ?? 0;
  if (n < 2) return;

  const curr = monthlySeries.values[n - 1];
  const prev = monthlySeries.values[n - 2];
  const currCount = monthlySeries.counts?.[n - 1] ?? 0;
  const prevCount = monthlySeries.counts?.[n - 2] ?? 0;

  const setTrend = (id, current, previous, invertColors = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (previous === 0 && current === 0) { el.innerHTML = ""; return; }
    if (previous === 0) {
      el.innerHTML = `<span class="kpi-trend-badge kpi-trend-new">✨ Novo mês</span>`;
      return;
    }
    const delta = ((current - previous) / previous) * 100;
    const sign = delta >= 0 ? "+" : "";
    const isUp = delta > 2;
    const isDown = delta < -2;
    // For spending: up = bad (red), down = good (green)
    // For items bought: up = good (green), down = bad (red)
    let cls;
    if (invertColors) {
      cls = isUp ? "kpi-trend-up" : isDown ? "kpi-trend-down" : "kpi-trend-flat";
    } else {
      cls = isUp ? "kpi-trend-down-inv" : isDown ? "kpi-trend-up-inv" : "kpi-trend-flat";
    }
    const arrow = isUp ? "↑" : isDown ? "↓" : "→";
    el.innerHTML = `<span class="kpi-trend-badge ${cls}">${arrow} ${sign}${Math.abs(delta).toFixed(1)}% vs anterior</span>`;
  };

  setTrend("kpi-trend-total", curr, prev, false);       // spending up = bad
  setTrend("kpi-trend-items", currCount, prevCount, true); // items up = good
  setTrend("kpi-trend-bought", curr, prev, false);
  setTrend("kpi-trend-pending", 0, 0, false);
  setTrend("kpi-trend-avg", 0, 0, false);

  // Monthly insight text
  const insightEl = document.getElementById("chart-monthly-insight");
  if (insightEl && prev > 0) {
    const delta = ((curr - prev) / prev) * 100;
    if (delta > 10) {
      insightEl.textContent = `↑ Gastos aumentaram ${delta.toFixed(1)}% vs mês anterior`;
      insightEl.style.color = "var(--danger)";
    } else if (delta < -10) {
      insightEl.textContent = `↓ Gastos reduziram ${Math.abs(delta).toFixed(1)}% — ótimo!`;
      insightEl.style.color = "var(--primary)";
    } else {
      insightEl.textContent = `Gastos estáveis vs mês anterior (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%)`;
      insightEl.style.color = "";
    }
  }
}

/* ---- Chart theme ---- */
function getChartTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  return {
    text:    isLight ? "#64748b" : "#5d6f8a",
    grid:    isLight ? "rgba(15,23,42,.06)"   : "rgba(148,163,184,.07)",
    tooltip: {
      bg:    isLight ? "#ffffff"  : "#141f30",
      title: isLight ? "#0f172a"  : "#e2e8f0",
      body:  isLight ? "#64748b"  : "#94a3b8",
      border:isLight ? "rgba(15,23,42,.12)" : "rgba(148,163,184,.14)",
    },
  };
}

function tooltipDefaults(t) {
  return {
    backgroundColor: t.tooltip.bg,
    titleColor:      t.tooltip.title,
    bodyColor:       t.tooltip.body,
    borderColor:     t.tooltip.border,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
    displayColors: false,
  };
}

const CATEGORY_COLORS = {
  "Limpeza e Higiene":   { bg: "rgba(34,197,94,.75)",  border: "#22c55e" },
  "Padaria e Laticínios":{ bg: "rgba(245,158,11,.75)", border: "#f59e0b" },
  "Bebidas":             { bg: "rgba(56,189,248,.75)", border: "#38bdf8" },
  "Proteínas e Ovos":    { bg: "rgba(249,115,22,.75)", border: "#f97316" },
  "Geral":               { bg: "rgba(167,139,250,.75)",border: "#a78bfa" },
  "Churrasco":           { bg: "rgba(239,68,68,.75)",  border: "#ef4444" },
};

const CAT_ORDER = [
  "Limpeza e Higiene",
  "Padaria e Laticínios",
  "Bebidas",
  "Proteínas e Ovos",
  "Geral",
  "Churrasco",
];

export function buildCharts() {
  const ctxPrice        = document.getElementById("chartPrice");
  const ctxMonthlySpent = document.getElementById("chartMonthlySpent");
  const ctxMonthlyCount = document.getElementById("chartMonthlyCount");
  const ctxStatus       = document.getElementById("chartStatus");
  const ctxCategory     = document.getElementById("chartCategory");
  if (!ctxPrice || !ctxMonthlySpent || !ctxMonthlyCount || !ctxStatus) return null;

  const t = getChartTheme();

  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size   = 12;
  Chart.defaults.color       = t.text;

  /* ---- Price distribution (bar) ---- */
  const priceChart = new Chart(ctxPrice, {
    type: "bar",
    data: {
      labels: ["Até R$ 10", "R$ 10–50", "Acima R$ 50"],
      datasets: [{
        label: "Itens",
        data: [0, 0, 0],
        backgroundColor: [
          "rgba(34,197,94,.70)",
          "rgba(96,165,250,.70)",
          "rgba(249,115,22,.70)",
        ],
        borderColor: ["#22c55e", "#60a5fa", "#f97316"],
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: tooltipDefaults(t),
      },
      scales: {
        y: {
          beginAtZero: true,
          grid:   { color: t.grid },
          ticks:  { color: t.text, stepSize: 1 },
          border: { display: false },
        },
        x: {
          grid:   { display: false },
          ticks:  { color: t.text },
          border: { display: false },
        },
      },
    },
  });

  /* ---- Category breakdown (doughnut) ---- */
  const categoryChart = ctxCategory ? new Chart(ctxCategory, {
    type: "doughnut",
    data: {
      labels: CAT_ORDER,
      datasets: [{
        data: CAT_ORDER.map(() => 0),
        backgroundColor: CAT_ORDER.map(c => CATEGORY_COLORS[c]?.bg || "rgba(100,116,139,.6)"),
        borderColor: CAT_ORDER.map(c => CATEGORY_COLORS[c]?.border || "#64748b"),
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: t.text,
            padding: 10,
            font: { size: 11 },
            usePointStyle: true,
            pointStyleWidth: 8,
            filter: (item, data) => (data.datasets[0].data[item.index] || 0) > 0,
          },
        },
        tooltip: {
          ...tooltipDefaults(t),
          displayColors: true,
          callbacks: {
            label: (ctx) => {
              const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
              return ` ${brlFmt.format(ctx.parsed)}`;
            },
          },
        },
      },
    },
  }) : null;

  /* ---- Monthly spending (bar) ---- */
  const brlFmt = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const brlCompact = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);

  const monthlyBarLabelPlugin = {
    id: "monthlyBarLabels",
    afterDatasetsDraw(chart) {
      const { ctx, data } = chart;
      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((bar, i) => {
        const value = data.datasets[0].data[i];
        if (value == null || value === 0) return;
        ctx.save();
        ctx.font = "600 10px 'Inter', system-ui, sans-serif";
        ctx.fillStyle = t.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(brlCompact(value), bar.x, bar.y - 8);
        ctx.restore();
      });
    },
  };

  const monthlyCountLabelPlugin = {
    id: "monthlyCountLabels",
    afterDatasetsDraw(chart) {
      const { ctx, data } = chart;
      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((bar, i) => {
        const value = data.datasets[0].data[i];
        if (value == null || value === 0) return;
        ctx.save();
        ctx.font = "600 10px 'Inter', system-ui, sans-serif";
        ctx.fillStyle = "rgba(37,99,235,0.92)";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${value} itens`, bar.x, bar.y - 8);
        ctx.restore();
      });
    },
  };

  const monthlyChartSpent = new Chart(ctxMonthlySpent, {
    type: "bar",
    plugins: [monthlyBarLabelPlugin],
    data: {
      labels: [],
      datasets: [{
        label: "Total (R$)",
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 0,
        borderRadius: 12,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 32, bottom: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipDefaults(t),
          callbacks: { label: (ctx) => ` ${brlFmt(ctx.parsed.y)}` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: t.grid },
          ticks: { color: t.text, callback: brlCompact },
          border: { display: false },
        },
        x: {
          grid: { display: false },
          ticks: { color: t.text, maxRotation: 0, minRotation: 0 },
          border: { display: false },
        },
      },
    },
  });

  const monthlyChartCount = new Chart(ctxMonthlyCount, {
    type: "bar",
    plugins: [monthlyCountLabelPlugin],
    data: {
      labels: [],
      datasets: [{
        label: "Itens comprados",
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 0,
        borderRadius: 12,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 32, bottom: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipDefaults(t),
          callbacks: { label: (ctx) => ` ${ctx.parsed.y} itens` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: t.grid },
          ticks: { color: t.text, precision: 0 },
          border: { display: false },
        },
        x: {
          grid: { display: false },
          ticks: { color: t.text, maxRotation: 0, minRotation: 0 },
          border: { display: false },
        },
      },
    },
  });

  /* ---- Status doughnut ---- */
  const statusChart = new Chart(ctxStatus, {
    type: "doughnut",
    data: {
      labels: ["Pendentes", "Comprados"],
      datasets: [{
        data: [0, 0],
        backgroundColor: ["rgba(245,158,11,.80)", "rgba(34,197,94,.80)"],
        borderColor: [t.tooltip.bg, t.tooltip.bg],
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: t.text,
            padding: 16,
            font: { size: 12 },
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: tooltipDefaults(t),
      },
    },
  });

  return { priceChart, monthlyChartSpent, monthlyChartCount, statusChart, categoryChart };
}

export function updateCharts({ charts, priceBuckets, monthlySeries, statusCounts, categoryTotals }) {
  if (!charts) return;

  charts.priceChart.data.datasets[0].data = [
    priceBuckets.at10,
    priceBuckets.between10and50,
    priceBuckets.above50,
  ];
  charts.priceChart.update();

  const values  = monthlySeries.values;
  const maxIdx  = values.length ? values.indexOf(Math.max(...values)) : -1;
  charts.monthlyChartSpent.data.labels           = monthlySeries.labels;
  charts.monthlyChartSpent.data.datasets[0].data = values;
  charts.monthlyChartSpent.data.datasets[0].backgroundColor = values.map((_, i) =>
    i === maxIdx ? "rgba(249,115,22,.80)" : "rgba(34,197,94,.65)");
  charts.monthlyChartSpent.data.datasets[0].borderColor = values.map((_, i) =>
    i === maxIdx ? "#f97316" : "#22c55e");
  charts.monthlyChartSpent.update();

  const counts = monthlySeries.counts || [];
  charts.monthlyChartCount.data.labels = monthlySeries.labels;
  charts.monthlyChartCount.data.datasets[0].data = counts;
  charts.monthlyChartCount.data.datasets[0].backgroundColor = counts.map(() =>
    "rgba(37,99,235,0.70)");
  charts.monthlyChartCount.data.datasets[0].borderColor = counts.map(() =>
    "#2563eb");
  charts.monthlyChartCount.update();

  charts.statusChart.data.datasets[0].data = [statusCounts.pending, statusCounts.bought];
  charts.statusChart.update();

  // Category chart update
  if (charts.categoryChart && categoryTotals) {
    const vals = CAT_ORDER.map(c => categoryTotals[c] || 0);
    charts.categoryChart.data.datasets[0].data = vals;
    charts.categoryChart.update();

    // Update insight text
    const topCat = CAT_ORDER.reduce((best, c) => {
      return (categoryTotals[c] || 0) > (categoryTotals[best] || 0) ? c : best;
    }, CAT_ORDER[0]);
    const insightEl = document.getElementById("chart-category-insight");
    if (insightEl && categoryTotals[topCat] > 0) {
      const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
      insightEl.textContent = `Maior gasto: ${topCat} (${brlFmt.format(categoryTotals[topCat])})`;
    }
  }
}
