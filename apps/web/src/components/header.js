export function renderHeader({
  periodLabel,
  userName,
  theme,
  deletedCount = 0,
  softDeleteEnabled = false,
  overBudgetCount = 0,
  overBudgetTitle = "",
}) {
  const restoreLabel = softDeleteEnabled
    ? `Restaurar (${deletedCount})`
    : "Restaurar indisponível";
  const purgeLabel = softDeleteEnabled
    ? `Apagar definitivo (${deletedCount})`
    : "Exclusão indisponível";

  const themeIcon = theme === "dark" ? "🌙" : "☀️";

  return `
  <div class="header-card">

    <!-- Linha 1: Brand + ações do usuário -->
    <div class="header-row header-row-top">
      <div class="header-brand">
        <h1>🛒 Lista de Compras</h1>
        <div class="sub">2026 · Mensal &amp; Analytics</div>
      </div>
      <div class="header-user">
        <div class="user-badge" title="Colaborador">👤 ${userName || "—"}</div>
        <button class="btn small btn-theme-toggle" data-action="toggle-theme" title="Alternar tema">${themeIcon}</button>
        <button class="btn small btn-change-name" data-action="logout">Trocar nome</button>
      </div>
    </div>

    <!-- Linha 2: Navegação de período + aviso de orçamento -->
    <div class="header-row header-row-period">
      <div class="period-nav">
        <button class="btn small" data-action="prev-month" title="Mês anterior">◀</button>
        <div class="period-badge" title="Período atual">📅 <span>${periodLabel}</span></div>
        <button class="btn small" data-action="next-month" title="Próximo mês">▶</button>
      </div>
      ${overBudgetCount > 0
        ? `<div class="over-budget-badge" title="${overBudgetTitle || ""}">⚠️ <span>${overBudgetCount} categoria(s) estourada(s)</span></div>`
        : ""}
    </div>

    <!-- Ações administrativas (colapsável) -->
    <details class="admin-actions">
      <summary>⚙️ Ações administrativas</summary>
      <div class="admin-row">
        <button class="btn warn small"   data-action="zero-prices">🗑️ Zerar preços</button>
        <button class="btn primary small" data-action="copy-next">📋 Copiar p/ próximo mês</button>
        <button class="btn danger small" data-action="delete-month">🗑️ Mover p/ lixeira</button>
        <button class="btn small" data-action="restore-month"
          ${deletedCount > 0 && softDeleteEnabled ? "" : "disabled"}>${restoreLabel}</button>
        <button class="btn danger small" data-action="purge-month"
          ${deletedCount > 0 && softDeleteEnabled ? "" : "disabled"}>${purgeLabel}</button>
      </div>
      <p class="admin-note">* Operações afetam apenas o período selecionado.</p>
    </details>
  </div>

  <!-- FAB: botão flutuante (só mobile) -->
  <button class="fab-add" data-action="open-add" title="Adicionar item">+</button>
  `;
}
