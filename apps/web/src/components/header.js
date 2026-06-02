export function renderHeader({
  periodLabel,
  userName,
  theme,
  deletedCount = 0,
  softDeleteEnabled = false,
  overBudgetCount = 0,
  overBudgetTitle = "",
  categories = [],
  selectedCategory = "ALL",
}) {
  const restoreLabel = softDeleteEnabled
    ? `Restaurar (${deletedCount})`
    : "Restaurar indisponível";
  const purgeLabel = softDeleteEnabled
    ? `Apagar definitivo (${deletedCount})`
    : "Exclusão indisponível";

  const themeIcon = theme === "dark" ? "🌙" : "☀️";

  // Gerar opções de categoria
  const categoryOptions = categories.map(cat => 
    `<option value="${cat}" ${selectedCategory === cat ? "selected" : ""}>${cat}</option>`
  ).join("");

  return `
  <div class="header-card">

    <!-- Título -->
    <div class="header-brand">
      <h1>🛒 LISTA DE COMPRAS</h1>
      <div class="sub">2026 · Mensal &amp; Analytics</div>
    </div>

    <!-- Linha 1: ações do usuário -->
    <div class="header-row header-row-top">
      <div class="header-user">
        <div class="user-badge" title="Colaborador">👤 ${userName || "—"}</div>
        <button class="btn small btn-theme-toggle" data-action="toggle-theme" title="Alternar tema">${themeIcon}</button>
        <button class="btn small btn-export" data-action="export-csv" title="Exportar CSV">📥 CSV</button>
        <button class="btn small btn-export" data-action="export-json" title="Exportar JSON">📥 JSON</button>
        <button class="btn small btn-export" data-action="share-list" title="Compartilhar lista">📤</button>
        <button class="btn small btn-change-name" data-action="logout">Trocar nome</button>
      </div>
    </div>

    <!-- Linha 2: Navegação de período + aviso de orçamento + filtro categoria -->
    <div class="header-row header-row-period">
      <div class="period-nav">
        <button class="btn small" data-action="prev-month" title="Mês anterior">◀</button>
        <div class="period-badge" title="Período atual">📅 <span>${periodLabel}</span></div>
        <button class="btn small" data-action="next-month" title="Próximo mês">▶</button>
        <button class="btn small btn-refresh" data-action="refresh-list" title="Atualizar lista" aria-label="Atualizar lista">🔄</button>
      </div>
      <div class="category-filter">
        <select id="categoryFilter" class="input small" title="Filtrar por categoria">
          <option value="ALL" ${selectedCategory === "ALL" ? "selected" : ""}>Todas categorias</option>
          ${categoryOptions}
        </select>
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

  <!-- Botão voltar ao topo -->
  <button class="back-to-top" id="backToTop" data-action="scroll-to-search" type="button" title="Ir para busca" aria-label="Ir para busca">
    ↑
  </button>
  `;
}
