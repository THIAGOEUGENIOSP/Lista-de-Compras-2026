import { brl } from "../utils/format.js";

export function renderDashboard(kpis) {
  const pct = kpis.progressPct ?? 0;
  const isGood = pct >= 70;

  const trendBadge = (id) =>
    `<div id="${id}" class="kpi-trend"></div>`;

  const scorePct = kpis.economyScore ?? null;
  const scoreColor =
    scorePct >= 90 ? "var(--primary)"
    : scorePct >= 70 ? "#f59e0b"
    : scorePct >= 50 ? "#f97316"
    : "var(--danger)";
  const scoreLabel =
    scorePct >= 90 ? "Excelente 🟢"
    : scorePct >= 70 ? "Bom 🟡"
    : scorePct >= 50 ? "Regular 🟠"
    : "Atenção 🔴";

  return `
  <div class="grid kpis">
    <div class="card kpi">
      <span class="kpi-icon">🛒</span>
      <div class="label">Total de itens</div>
      <div class="value">${kpis.totalItems}</div>
      ${trendBadge("kpi-trend-items")}
    </div>
    <div class="card kpi">
      <span class="kpi-icon">💰</span>
      <div class="label">Valor total</div>
      <div class="value">${brl(kpis.totalValue)}</div>
      ${trendBadge("kpi-trend-total")}
    </div>
    <div class="card kpi">
      <span class="kpi-icon">✅</span>
      <div class="label">Já comprado</div>
      <div class="value">${brl(kpis.boughtValue)}</div>
      ${trendBadge("kpi-trend-bought")}
    </div>
    <div class="card kpi">
      <span class="kpi-icon">⏳</span>
      <div class="label">Pendente</div>
      <div class="value">${brl(kpis.pendingValue)}</div>
      ${trendBadge("kpi-trend-pending")}
    </div>
    <div class="card kpi">
      <span class="kpi-icon">📊</span>
      <div class="label">Preço médio</div>
      <div class="value">${brl(kpis.avgItemTotal)}</div>
      ${trendBadge("kpi-trend-avg")}
    </div>
  </div>

  <div class="card section" style="margin-top:12px">
    <div class="row space-between" style="flex-wrap:wrap;gap:12px">
      <div>
        <h2>Progresso das compras</h2>
        <div class="muted" style="margin-top:3px;font-size:12px">
          Itens comprados vs pendentes (por quantidade)
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="badge ${isGood ? "ok" : "pending"}">
          ${isGood ? "✅" : "⏳"}
          <span><b>${pct}%</b> comprado</span>
        </div>
        ${scorePct !== null ? `
        <div class="economy-score-badge" style="--score-color:${scoreColor}">
          <span class="economy-score-icon">💡</span>
          <span class="economy-score-label">Score</span>
          <span class="economy-score-value" style="color:${scoreColor}">${scorePct}</span>
          <span class="economy-score-status" style="color:${scoreColor}">${scoreLabel}</span>
        </div>` : ""}
      </div>
    </div>

    <div style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="muted" style="font-size:12px">
          ${kpis.boughtItems ?? 0} de ${kpis.totalItems} itens
        </span>
        <span style="font-size:12px;font-weight:700;color:${isGood ? "var(--primary)" : "var(--warn)"}">
          ${pct}%
        </span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
  </div>
  `;
}
