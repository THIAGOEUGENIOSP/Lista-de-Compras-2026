import { brl } from "../utils/format.js";
import { getCategoryMeta } from "../utils/shoppingCategories.js";

function badgeClass(status) {
  if (status === "OVER") return "pending";
  if (status === "ATTENTION") return "pending";
  if (status === "OK") return "ok";
  return "";
}

function badgeLabel(status) {
  if (status === "OVER") return "Estourado";
  if (status === "ATTENTION") return "No limite";
  if (status === "OK") return "Dentro da meta";
  return "Sem meta";
}

export function renderBudgetPanel({ rows, totalSpent, totalBudget, collapsed }) {
  const safeRows = rows || [];
  const hasAnyBudget = safeRows.some((row) => Number(row.budget || 0) > 0);

  return `
    <div class="card section budget-panel" style="margin-top:12px">
      <div class="row space-between">
        <div>
          <h2>Orçamento por Categoria</h2>
          <div class="muted" style="font-size:12px;margin-top:4px">
            Defina metas mensais e acompanhe alertas de estouro por categoria.
          </div>
        </div>
        <div class="row" style="gap:8px">
          <button class="btn small" id="toggleBudgetPanel" data-action="toggle-budget-panel">
            ${collapsed ? "Expandir" : "Recolher"}
          </button>
          <div class="badge ${hasAnyBudget ? "ok" : ""}">
            Meta total: <b>${brl(totalBudget || 0)}</b>
          </div>
          <div class="badge ${(totalBudget > 0 && totalSpent > totalBudget) ? "pending" : "ok"}">
            Gasto total: <b>${brl(totalSpent || 0)}</b>
          </div>
        </div>
      </div>

      <div class="budget-content" style="${collapsed ? "display:none" : "display:block"}">
      <div class="budget-table-wrap" style="margin-top:10px">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Meta (R$)</th>
              <th>Gasto</th>
              <th>Saldo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${safeRows.map((row) => {
              const meta = getCategoryMeta(row.category);
              const statusClass = badgeClass(row.status);
              return `
                <tr class="budget-row ${meta.className}">
                  <td><span class="cat-icon">${meta.icon}</span><b>${row.category}</b></td>
                  <td style="min-width:120px">
                    <input
                      class="input budget-input"
                      type="text"
                      inputmode="decimal"
                      data-currency="brl"
                      data-budget-category="${row.category}"
                      value="${brl(Number(row.budget || 0))}"
                    />
                  </td>
                  <td>${brl(row.spent)}</td>
                  <td>${brl(row.balance)}</td>
                  <td><span class="badge ${statusClass}">${badgeLabel(row.status)}</span></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="budget-mobile" style="margin-top:10px">
        ${safeRows.map((row) => {
          const meta = getCategoryMeta(row.category);
          const statusClass = badgeClass(row.status);
          return `
            <div class="budget-card category-block ${meta.className}">
              <div class="row space-between">
                <div><span class="cat-icon">${meta.icon}</span><b>${row.category}</b></div>
                <span class="badge ${statusClass}">${badgeLabel(row.status)}</span>
              </div>
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
                <div>
                  <div class="muted" style="font-size:11px">Meta</div>
                  <input
                    class="input budget-input"
                    type="text"
                    inputmode="decimal"
                    data-currency="brl"
                    data-budget-category="${row.category}"
                    value="${brl(Number(row.budget || 0))}"
                  />
                </div>
                <div>
                  <div class="muted" style="font-size:11px">Gasto</div>
                  <div><b>${brl(row.spent)}</b></div>
                </div>
                <div>
                  <div class="muted" style="font-size:11px">Saldo</div>
                  <div>${brl(row.balance)}</div>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      </div>
    </div>
  `;
}
