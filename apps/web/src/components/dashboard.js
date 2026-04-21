import { brl } from "../utils/format.js";

export function renderDashboard(kpis) {
  const pct = kpis.progressPct ?? 0;
  const isGood = pct >= 70;

  return `
  <div class="grid kpis">
    <div class="card kpi">
      <span class="kpi-icon">🛒</span>
      <div class="label">Total de itens</div>
      <div class="value">${kpis.totalItems}</div>
    </div>
    <div class="card kpi">
      <span class="kpi-icon">💰</span>
      <div class="label">Valor total</div>
      <div class="value">${brl(kpis.totalValue)}</div>
    </div>
    <div class="card kpi">
      <span class="kpi-icon">✅</span>
      <div class="label">Já comprado</div>
      <div class="value">${brl(kpis.boughtValue)}</div>
    </div>
    <div class="card kpi">
      <span class="kpi-icon">⏳</span>
      <div class="label">Pendente</div>
      <div class="value">${brl(kpis.pendingValue)}</div>
    </div>
    <div class="card kpi">
      <span class="kpi-icon">📊</span>
      <div class="label">Preço médio</div>
      <div class="value">${brl(kpis.avgItemTotal)}</div>
    </div>
  </div>

  <div class="card section" style="margin-top:12px">
    <div class="row space-between">
      <div>
        <h2>Progresso das compras</h2>
        <div class="muted" style="margin-top:3px;font-size:12px">
          Itens comprados vs pendentes (por quantidade)
        </div>
      </div>
      <div class="badge ${isGood ? "ok" : "pending"}">
        ${isGood ? "✅" : "⏳"}
        <span><b>${pct}%</b> comprado</span>
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
