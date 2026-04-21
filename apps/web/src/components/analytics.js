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
        <div class="muted" style="font-size:12px;margin-top:3px">Insights automáticos, gráficos e Consultor IA</div>
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

    <!-- Gráficos em 3 colunas -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-card-label">💰 Distribuição de preços</div>
        <div class="chart-card-sub">Unitário por faixa de valor</div>
        <div class="chart-box"><canvas id="chartPrice"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-label">📈 Evolução mensal</div>
        <div class="chart-card-sub">Total gasto (R$) por período</div>
        <div class="chart-box"><canvas id="chartMonthly"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-label">🍩 Pendentes vs Comprados</div>
        <div class="chart-card-sub">Proporção por quantidade</div>
        <div class="chart-box"><canvas id="chartStatus"></canvas></div>
      </div>
    </div>

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
        <div class="tips-title">💡 Dicas automáticas</div>
        <div class="tips-list">
          ${tips.map((t) => `<div class="tip-item"><span class="tip-dot"></span><span>${t}</span></div>`).join("")}
        </div>
      </div>` : ""}
    </div>

  </div>
  `;
}

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

export function buildCharts() {
  const ctxPrice   = document.getElementById("chartPrice");
  const ctxMonthly = document.getElementById("chartMonthly");
  const ctxStatus  = document.getElementById("chartStatus");
  if (!ctxPrice || !ctxMonthly || !ctxStatus) return null;

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

  /* ---- Monthly spending (bar) ---- */
  const brl = (v) =>
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
        if (!value) return;
        ctx.save();
        ctx.font = "600 10px 'Inter', system-ui, sans-serif";
        ctx.fillStyle = t.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(brlCompact(value), bar.x, bar.y - 4);
        ctx.restore();
      });
    },
  };

  const monthlyChart = new Chart(ctxMonthly, {
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
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipDefaults(t),
          callbacks: {
            label: (ctx) => ` ${brl(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid:   { color: t.grid },
          ticks:  {
            color: t.text,
            callback: brlCompact,
          },
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

  return { priceChart, monthlyChart, statusChart };
}

export function updateCharts({ charts, priceBuckets, monthlySeries, statusCounts }) {
  if (!charts) return;

  charts.priceChart.data.datasets[0].data = [
    priceBuckets.at10,
    priceBuckets.between10and50,
    priceBuckets.above50,
  ];
  charts.priceChart.update();

  const values  = monthlySeries.values;
  const maxIdx  = values.length ? values.indexOf(Math.max(...values)) : -1;
  charts.monthlyChart.data.labels           = monthlySeries.labels;
  charts.monthlyChart.data.datasets[0].data = values;
  charts.monthlyChart.data.datasets[0].backgroundColor = values.map((_, i) =>
    i === maxIdx ? "rgba(249,115,22,.80)" : "rgba(34,197,94,.65)");
  charts.monthlyChart.data.datasets[0].borderColor = values.map((_, i) =>
    i === maxIdx ? "#f97316" : "#22c55e");
  charts.monthlyChart.update();

  charts.statusChart.data.datasets[0].data = [statusCounts.pending, statusCounts.bought];
  charts.statusChart.update();
}
