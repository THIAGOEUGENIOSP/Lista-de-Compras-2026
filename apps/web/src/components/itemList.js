// src/components/itemList.js
import { brl, formatQuantidade, isPesoCategoria } from "../utils/format.js";
import { getCategoryMeta, normalizeShoppingCategory } from "../utils/shoppingCategories.js";

function collabName(it) {
  return (
    it?.criado_por_nome ||
    it?.criado_por ||
    it?.colaborador ||
    it?.usuario_nome ||
    "—"
  );
}

function collaboratorOptions(state) {
  const names = Array.from(
    new Set((state?.items || []).map((it) => collabName(it)).filter(Boolean)),
  ).sort((a, b) =>
    a.localeCompare(b, "pt-BR", {
      sensitivity: "base",
    }),
  );

  const selected = String(state?.filterCollaborator || "ALL");
  if (selected !== "ALL" && !names.includes(selected)) {
    names.unshift(selected);
  }

  return names;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isChurrasco(it) {
  return isPesoCategoria(normalizeShoppingCategory(it?.categoria));
}

function totalOfItem(it) {
  const qtd = Number(it?.quantidade || 0);
  const unit = Number(it?.valor_unitario || 0);
  return isChurrasco(it) ? unit : qtd * unit;
}

function sortItems(items, sortKey) {
  const arr = [...items];
  switch (sortKey) {
    case "name_asc":
      arr.sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
          sensitivity: "base",
        }),
      );
      break;
    case "value_desc":
      arr.sort(
        (a, b) => totalOfItem(b) - totalOfItem(a),
      );
      break;
    case "value_asc":
      arr.sort(
        (a, b) => totalOfItem(a) - totalOfItem(b),
      );
      break;
    case "created_desc":
    default:
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }
  return arr;
}

function sumTotals(items) {
  return items.reduce(
    (acc, it) => {
      acc.qtd += Number(it.quantidade || 0);
      acc.total += totalOfItem(it);
      return acc;
    },
    { qtd: 0, total: 0 },
  );
}

function renderSummaryRow(items, forChurrasco) {
  const { qtd, total } = sumTotals(items);
  const qtdLabel = forChurrasco
    ? formatQuantidade(qtd, "Churrasco")
    : `${qtd.toLocaleString("pt-BR")} un`;

  return `
    <tr class="row-summary">
      <td><b>Resumo</b></td>
      <td><b>${qtdLabel}</b></td>
      <td>—</td>
      <td><b>${brl(total)}</b></td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
    </tr>
  `;
}

function renderTableBlock({
  title,
  items,
  metaClass = "",
  icon = "",
  showSummary = true,
  toggleLabel = "",
  isCollapsed = false,
  favorites = new Set(),
}) {
  const headSub = `
    <div class="category-head-sub">
      <div class="cat-count">${items.length} item(ns)</div>
      <div class="row" style="gap:6px">
        <button class="btn small category-collapse-btn" data-action="toggle-bought" type="button">
          ${toggleLabel || "▾"}
        </button>
        <button class="btn small category-top-btn" data-action="scroll-top" type="button" onclick="(document.scrollingElement || document.documentElement || document.body).scrollTo({ top: 0, left: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });">Início</button>
      </div>
    </div>
  `;

  const tableHtml = isCollapsed
    ? ""
    : `
    <div class="table-wrap" style="margin-top:10px">
      <table class="category-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qtd</th>
            <th>V. Unit.</th>
            <th>Total</th>
            <th>Status</th>
            <th>Colaborador</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          ${items
            .map((it) => {
              const total = totalOfItem(it);
              const isBought = it.status === "COMPRADO";

              const statusBadge = isBought
                ? `<span class="badge ok" role="button"
                    data-action="toggle-status"
                    data-id="${it.id}"
                    data-next="PENDENTE">✔ Comprado</span>`
                : `<span class="badge pending" role="button"
                    data-action="toggle-status"
                    data-id="${it.id}"
                    data-next="COMPRADO">⏳ Pendente</span>`;

              const qtdDisplay = isChurrasco(it)
                ? formatQuantidade(it.quantidade, it.categoria)
                : it.quantidade;

              const catLabel = normalizeShoppingCategory(it?.categoria || "Geral");
              const catMeta = getCategoryMeta(catLabel);
              const isFavorite = favorites.has(it.nome);

              return `
              <tr class="${isBought ? "row-bought" : "row-pending"} ${catMeta.className}">
                <td>
                  <div class="item-name-row">
                    <button 
                      class="btn-icon favorite-btn ${isFavorite ? 'favorite-active' : ''}" 
                      data-action="toggle-favorite" 
                      data-name="${escapeHtml(it.nome)}"
                      title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
                      aria-label="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
                    >
                      ${isFavorite ? '⭐' : '☆'}
                    </button>
                    <div class="item-name" style="font-weight:700">${it.nome}</div>
                  </div>
                  <div class="item-cat"><span class="cat-tag ${catMeta.className}">${catLabel}</span></div>
                </td>

                <td style="min-width:140px">
                  <div class="editing-cell">
                    <span
                      data-view
                      data-action="edit-cell"
                      data-field="quantidade"
                      data-id="${it.id}"
                    >${qtdDisplay}</span>
                  </div>
                </td>

                <td style="min-width:180px">
                  <div class="editing-cell">
                    <span
                      data-view
                      data-action="edit-cell"
                      data-field="valor_unitario"
                      data-id="${it.id}"
                    >${brl(it.valor_unitario)}</span>
                  </div>
                </td>

                <td><b>${brl(total)}</b></td>
                <td>${statusBadge}</td>
                <td class="collab-name-cell"><span class="collab-name">${collabName(it)}</span></td>

                <td>
                  <div class="row actions-row" style="gap:6px">
                    <button class="btn small" data-action="edit" data-id="${it.id}">Editar</button>
                    <button class="btn small danger" data-action="delete" data-id="${it.id}">Excluir</button>
                  </div>
                </td>
              </tr>
            `;
            })
            .join("")}
          ${showSummary ? renderSummaryRow(items, false) : ""}
        </tbody>
      </table>
    </div>
  `;

  return `
  <div class="card section only-desktop category-desktop-block ${metaClass}" style="margin-top:12px">
    <div class="category-block category-pill-head ${metaClass}">
      <div class="category-head">
        <div class="category-title-wrap">
          <span class="cat-dot" aria-hidden="true">${icon}</span>
          <h2 class="cat-title">${title}</h2>
        </div>
        ${headSub}
      </div>
    </div>

    ${tableHtml}
  </div>
  `;
}

export function renderItemListControls(state) {
  const names = collaboratorOptions(state);
  const items = state?.items || [];
  const totalAll     = items.length;
  const totalPending = items.filter((it) => it.status === "PENDENTE").length;
  const totalBought  = items.filter((it) => it.status === "COMPRADO").length;

  const isAll     = state.filterStatus === "ALL";
  const isPending = state.filterStatus === "PENDENTE";
  const isBought  = state.filterStatus === "COMPRADO";

  return `
  <div class="card controls-card" id="listControls">
    <!-- Linha 1: CTA + filtro segmentado -->
    <div class="controls-top">
      <button class="btn btn-add-item only-desktop" data-action="open-add">
        ＋ Adicionar item
      </button>

      <div class="seg-control">
        <button class="seg-btn ${isAll ? "seg-active" : ""}" data-filter="ALL">
          Todos
          <span class="seg-count">${totalAll}</span>
        </button>
        <button class="seg-btn ${isPending ? "seg-active" : ""}" data-filter="PENDENTE">
          ⏳ Pendentes
          <span class="seg-count">${totalPending}</span>
        </button>
        <button class="seg-btn ${isBought ? "seg-active" : ""}" data-filter="COMPRADO">
          ✅ Comprados
          <span class="seg-count">${totalBought}</span>
        </button>
      </div>
    </div>

    <!-- Linha 2: busca + filtros -->
    <div class="controls-bottom">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="8.5" cy="8.5" r="5.25"/>
          <path stroke-linecap="round" d="m12.5 12.5 4 4"/>
        </svg>
        <input
          class="input search-input"
          id="searchInput"
          placeholder="Buscar item..."
          value="${escapeHtml(state.searchText || "")}"
          autocomplete="off"
        />
      </div>

      <select id="collaboratorFilter" title="Filtrar por colaborador">
        <option value="ALL" ${state.filterCollaborator === "ALL" ? "selected" : ""}>👤 Todos</option>
        ${names
          .map(
            (name) =>
              `<option value="${escapeHtml(name)}" ${state.filterCollaborator === name ? "selected" : ""}>${escapeHtml(name)}</option>`,
          )
          .join("")}
      </select>

      <select id="sortSelect" title="Ordenar por">
        <option value="created_desc" ${state.sortKey === "created_desc" ? "selected" : ""}>🕐 Mais recentes</option>
        <option value="name_asc"     ${state.sortKey === "name_asc"     ? "selected" : ""}>🔤 Nome (A-Z)</option>
        <option value="value_desc"   ${state.sortKey === "value_desc"   ? "selected" : ""}>💰 Maior valor</option>
        <option value="value_asc"    ${state.sortKey === "value_asc"    ? "selected" : ""}>💸 Menor valor</option>
      </select>

      ${totalPending > 0 ? `
      <button class="btn btn-shopping-mode only-mobile" data-action="open-shopping-mode" title="Modo Compras">
        🛒 Modo Compras
      </button>` : ""}
    </div>
  </div>
  `;
}

function renderEmptyState(searchText = "") {
  const hasSearch = String(searchText || "").trim().length > 0;
  if (hasSearch) {
    return `
      <div class="card empty-state">
        <span class="empty-state-icon">🔍</span>
        <h3>Nenhum resultado</h3>
        <p>Nenhum item encontrado para "<strong>${escapeHtml(searchText)}</strong>".<br>Tente outro termo.</p>
      </div>
    `;
  }
  return `
    <div class="card empty-state">
      <span class="empty-state-icon">🛒</span>
      <h3>Lista vazia</h3>
      <p>Ainda não há itens neste período.<br>Adicione o primeiro item para começar!</p>
      <button class="btn btn-add-item" data-action="open-add" style="margin:0 auto">
        ＋ Adicionar primeiro item
      </button>
    </div>
  `;
}

export function renderItemTable(
  items,
  sortKey,
  searchText = "",
  showBought = false,
  showPending = true,
  favorites = new Set(),
) {
  const hasSearch = String(searchText || "").trim().length > 0;
  const sorted = sortItems(items, sortKey);

  if (sorted.length === 0) {
    return renderEmptyState(searchText);
  }

  if (hasSearch) {
    return `
      <div class="table-list-wrap">
        ${renderTableBlock({
          title: "Resultados da busca",
          items: sorted,
          metaClass: "cat-general",
          icon: "🔎",
          showSummary: false,
          favorites,
        })}
      </div>
    `;
  }

  const pending = sorted.filter((it) => it.status === "PENDENTE");
  const bought = sorted.filter((it) => it.status === "COMPRADO");

  return `
    <div class="table-list-wrap">
      ${renderTableBlock({
        title: "Pendentes",
        items: pending,
        metaClass: "status-pending",
        icon: "⏳",
        showSummary: false,
        toggleLabel: showPending ? "▾" : "▸",
        isCollapsed: !showPending,
        favorites,
      })}
      ${renderTableBlock({
        title: "Comprados",
        items: bought,
        metaClass: "status-bought",
        icon: "✔️",
        showSummary: false,
        toggleLabel: showBought ? "▾" : "▸",
        isCollapsed: !showBought,
        favorites,
      })}
    </div>
  `;
}

export function renderItemMobileList(
  items,
  sortKey,
  searchText = "",
  showBought = false,
  showPending = true,
  favorites = new Set(),
  priceHistoryMap = {},
) {
  const hasSearch = String(searchText || "").trim().length > 0;
  const sorted = sortItems(items, sortKey);

  const renderMobileBlock = (
    title,
    blockItems,
    metaClass = "",
    icon = "",
    toggleLabel = "",
    isCollapsed = false,
    showSummary = true,
  ) => {
    const { qtd, total } = sumTotals(blockItems);
    const qtdLabel = `${qtd.toLocaleString("pt-BR")} un`;

  const headSub = `
        <div class="category-head-sub">
          <div class="cat-count">${blockItems.length} item(ns)</div>
          <div class="row" style="gap:6px">
            <button class="btn small category-collapse-btn" data-action="toggle-bought" type="button">
              ${toggleLabel || "▾"}
            </button>
            <button class="btn small category-top-btn" data-action="scroll-top" type="button" onclick="(document.scrollingElement || document.documentElement || document.body).scrollTo({ top: 0, left: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });">Início</button>
          </div>
        </div>
      `;

    const header = `
      <div class="card section only-mobile category-block category-pill-head ${metaClass}" style="margin-top:12px">
        <div class="category-head">
          <div class="category-title-wrap">
            <span class="cat-dot" aria-hidden="true">${icon}</span>
            <h2 class="cat-title">${title}</h2>
          </div>
          ${headSub}
        </div>
      </div>
    `;

    return `
      ${header}
      ${
        isCollapsed
          ? ""
          : `
      <div class="mobile-list ${metaClass}" aria-label="Lista mobile ${title}">
        ${blockItems
          .map((it) => {
            const totalItem = totalOfItem(it);
            const isBought = it.status === "COMPRADO";
            const next = isBought ? "PENDENTE" : "COMPRADO";
            const qtdDisplay = isChurrasco(it)
              ? formatQuantidade(it.quantidade, it.categoria)
              : `${Number(it.quantidade || 0).toLocaleString("pt-BR")} un`;

            const catLabel = normalizeShoppingCategory(it?.categoria || "Geral");
            const catMeta = getCategoryMeta(catLabel);
            const isFavorite = favorites.has(it.nome);

            // Alerta de preço
            const histKey = String(it.nome || "").trim().toLowerCase();
            const lastPriceEntry = priceHistoryMap[histKey];
            let priceAlert = "";
            if (lastPriceEntry && Number(it.valor_unitario) > 0 && Number(lastPriceEntry.valor_unitario) > 0) {
              const curr = Number(it.valor_unitario);
              const prev = Number(lastPriceEntry.valor_unitario);
              const pct = ((curr - prev) / prev) * 100;
              if (pct >= 20) {
                priceAlert = `<span class="price-alert price-alert-up">⬆ +${pct.toFixed(0)}%</span>`;
              } else if (pct <= -15) {
                priceAlert = `<span class="price-alert price-alert-down">⬇ ${pct.toFixed(0)}%</span>`;
              }
            }

            return `
            <div class="mcard ${isBought ? "row-bought" : "row-pending"} ${catMeta.className}" data-swipe-id="${it.id}">
              <div class="swipe-hint swipe-hint-left">✓ Comprado</div>
              <div class="swipe-hint swipe-hint-right">🗑 Deletar</div>
              <div class="mcard-inner">
                <div class="mcard-header">
                  <div class="mname-row">
                    <button
                      class="btn-icon favorite-btn ${isFavorite ? 'favorite-active' : ''}"
                      data-action="toggle-favorite"
                      data-name="${escapeHtml(it.nome)}"
                      title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
                      aria-label="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
                    >
                      ${isFavorite ? '⭐' : '☆'}
                    </button>
                    <div class="mname">${it.nome}</div>
                    ${priceAlert}
                  </div>
                  <div class="mtotal">
                    <div class="label">Total</div>
                    <div class="value">${brl(totalItem)}</div>
                    <div class="mstatus ${isBought ? "bought" : "pending"}">
                      ${isBought ? "Comprado" : "Pendente"}
                    </div>
                  </div>
                </div>

                <div class="mmeta">
                  <span>Por: <b>${collabName(it)}</b></span>
                  <span class="cat-tag ${catMeta.className}">${catLabel}</span>
                </div>

                <div class="mrow">
                  <div class="mrow-labels">
                    <div class="mfield-label">Preço (unit)</div>
                    <div class="mfield-label">Quantidade</div>
                    <div class="mfield-label mactions-label">Ações</div>
                  </div>
                  <div class="mrow-values">
                    <div
                      class="pill editing-cell mobile-edit-cell"
                      title="Editar preço"
                      data-action="edit-cell"
                      data-field="valor_unitario"
                      data-inline="true"
                      data-id="${it.id}"
                    >
                      <div class="pvalue">${brl(it.valor_unitario)}</div>
                    </div>
                    <div
                      class="pill qtybox editing-cell mobile-edit-cell"
                      title="Editar quantidade"
                      data-action="edit-cell"
                      data-field="quantidade"
                      data-inline="true"
                      data-id="${it.id}"
                    >
                      <div class="pvalue">${qtdDisplay}</div>
                    </div>
                    <div class="mactions-inline">
                      <button class="icon-btn-action ${isBought ? "active" : ""}" title="Marcar" data-action="toggle-status" data-id="${it.id}" data-next="${next}">
                        ${isBought ? "↩️" : "✔️"}
                      </button>
                      <button class="icon-btn-action" title="Editar" data-action="edit" data-id="${it.id}">✏️</button>
                      <button class="icon-btn-action danger" title="Excluir" data-action="delete" data-id="${it.id}">🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
          })
          .join("")}

        ${
          showSummary
            ? `
        <div class="mcard summary">
          <div class="mcard-inner">
            <div class="mcard-header">
              <div class="mname">Resumo</div>
              <div class="mtotal">
                <div class="label">Total</div>
                <div class="value">${brl(total)}</div>
              </div>
            </div>
            <div class="mmeta">
              <span>Qtd: <b>${qtdLabel}</b></span>
            </div>
          </div>
        </div>
        `
            : ""
        }
      </div>
      `
      }
    `;
  };

  if (sorted.length === 0) {
    return renderEmptyState(searchText);
  }

  if (hasSearch) {
    return `
      <div class="mobile-list-wrap">
        ${renderMobileBlock(
          "Resultados da busca",
          sorted,
          "cat-general",
          "🔎",
          "",
          false,
        )}
      </div>
    `;
  }

  const pending = sorted.filter((it) => it.status === "PENDENTE");
  const bought = sorted.filter((it) => it.status === "COMPRADO");

  return `
    <div class="mobile-list-wrap">
      ${renderMobileBlock(
        "Pendentes",
        pending,
        "status-pending",
        "⏳",
        showPending ? "▾" : "▸",
        !showPending,
        false,
      )}
      ${renderMobileBlock(
        "Comprados",
        bought,
        "status-bought",
        "✔️",
        showBought ? "▾" : "▸",
        !showBought,
        false,
      )}
    </div>
  `;
}
