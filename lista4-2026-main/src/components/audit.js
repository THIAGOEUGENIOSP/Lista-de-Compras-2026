const ACTION_LABELS = {
  ITEM_SOFT_DELETE: "Excluir item (lixeira)",
  ITEM_HARD_DELETE: "Excluir item (permanente)",
  ITEM_RESTORE: "Restaurar item",
  MONTH_SOFT_DELETE: "Mover mês p/ lixeira",
  MONTH_HARD_DELETE: "Excluir mês (permanente)",
  MONTH_RESTORE: "Restaurar mês",
  MONTH_PURGE_DELETED: "Apagar definitivo da lixeira",
  BULK_ZERO_PRICES: "Zerar preços",
};

const ACTION_OPTIONS = [
  "ALL",
  "ITEM_SOFT_DELETE",
  "ITEM_RESTORE",
  "MONTH_SOFT_DELETE",
  "MONTH_RESTORE",
  "MONTH_PURGE_DELETED",
  "BULK_ZERO_PRICES",
];

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAction(action) {
  const key = String(action || "").trim();
  return ACTION_LABELS[key] || key || "Ação";
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detailsSummary(details) {
  if (!details || typeof details !== "object") return "—";
  const parts = [];
  if (details.reason) parts.push(`Motivo: ${details.reason}`);
  if (details.deleted_count != null) parts.push(`Qtd: ${details.deleted_count}`);
  if (details.restored_count != null) parts.push(`Restaurados: ${details.restored_count}`);
  if (details.affected_count != null) parts.push(`Afetados: ${details.affected_count}`);
  return parts.length ? parts.join(" • ") : "—";
}

export function renderAuditLogSection({ enabled, logs, actionFilter }) {
  if (!enabled) {
    return `
      <div class="card section" style="margin-top:12px">
        <h2>Auditoria</h2>
        <div class="muted" style="margin-top:6px">
          Indisponível neste banco. Execute a migração de <code>audit_log</code> para habilitar.
        </div>
      </div>
    `;
  }

  const selected = String(actionFilter || "ALL");
  const filtered = (logs || []).filter((row) => {
    if (selected === "ALL") return true;
    return String(row?.action || "") === selected;
  });

  return `
    <div class="card section" style="margin-top:12px">
      <div class="row space-between">
        <div>
          <h2>Auditoria</h2>
          <div class="muted" style="font-size:12px;margin-top:4px">Eventos críticos do período atual</div>
        </div>
        <div class="row" style="gap:8px">
          <select id="auditActionFilter" title="Filtrar ação">
            ${ACTION_OPTIONS.map((action) => {
              const label = action === "ALL" ? "Todas ações" : formatAction(action);
              const isSelected = selected === action ? "selected" : "";
              return `<option value="${action}" ${isSelected}>${escapeHtml(label)}</option>`;
            }).join("")}
          </select>
        </div>
      </div>

      <div class="muted" style="font-size:12px;margin-top:8px">${filtered.length} registro(s)</div>

      <div class="audit-table-wrap" style="margin-top:10px">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Ação</th>
              <th>Colaborador</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length
              ? filtered.map((row) => `
                <tr>
                  <td>${escapeHtml(formatDateTime(row.created_at))}</td>
                  <td><span class="badge">${escapeHtml(formatAction(row.action))}</span></td>
                  <td>${escapeHtml(row.collaborator_name || "—")}</td>
                  <td>${escapeHtml(detailsSummary(row.details))}</td>
                </tr>
              `).join("")
              : `<tr><td colspan="4" class="muted">Sem eventos para o filtro atual.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="audit-mobile" style="margin-top:10px">
        ${filtered.length
          ? filtered.map((row) => `
            <div class="audit-card">
              <div class="row space-between">
                <div><b>${escapeHtml(formatAction(row.action))}</b></div>
                <div class="muted" style="font-size:12px">${escapeHtml(formatDateTime(row.created_at))}</div>
              </div>
              <div class="muted" style="font-size:12px;margin-top:6px">Por: <b>${escapeHtml(row.collaborator_name || "—")}</b></div>
              <div class="muted" style="font-size:12px;margin-top:4px">${escapeHtml(detailsSummary(row.details))}</div>
            </div>
          `).join("")
          : `<div class="muted">Sem eventos para o filtro atual.</div>`}
      </div>
    </div>
  `;
}

