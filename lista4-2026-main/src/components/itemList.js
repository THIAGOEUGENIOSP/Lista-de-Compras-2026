// src/components/itemList.js
import { brl, formatQuantidade, isPesoCategoria } from "../utils/format.js";
import {
  classifyShoppingCategory,
  groupShoppingItemsByCategory,
  normalizeShoppingCategory,
} from "../utils/shoppingCategories.js";

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

function displayGeneralCategory(it) {
  const normalized = normalizeShoppingCategory(it?.categoria);
  if (normalized !== "Geral") return normalized;
  return classifyShoppingCategory(it?.nome || "");
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

function renderTableBlock({ title, items, showCategory }) {
  return `
  <div class="card section only-desktop" style="margin-top:12px">
    <div class="row space-between">
      <h2>${title}</h2>
      <div class="muted" style="font-size:12px">${items.length} item(ns)</div>
    </div>

    <div class="table-wrap" style="margin-top:10px">
      <table>
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

              return `
              <tr class="${isBought ? "row-bought" : ""}">
                <td>
                  <div class="item-name" style="font-weight:700">${it.nome}</div>
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
          ${renderSummaryRow(items, !showCategory)}
        </tbody>
      </table>
    </div>
  </div>
  `;
}

export function renderItemListControls(state) {
  const names = collaboratorOptions(state);
  return `
  <div class="card section">
    <div class="row space-between">
      <div class="row" style="gap:10px">
        <button class="btn primary" data-action="open-add">+ Adicionar item</button>

        <div class="row" style="gap:6px">
          <button class="btn small ${state.filterStatus === "ALL" ? "primary" : ""}" data-filter="ALL">Todos</button>
          <button class="btn small ${state.filterStatus === "PENDENTE" ? "primary" : ""}" data-filter="PENDENTE">Pendentes</button>
          <button class="btn small ${state.filterStatus === "COMPRADO" ? "primary" : ""}" data-filter="COMPRADO">Comprados</button>
        </div>
      </div>

      <div class="row">
        <select id="collaboratorFilter" title="Filtrar por colaborador">
          <option value="ALL" ${state.filterCollaborator === "ALL" ? "selected" : ""}>Todos usuários</option>
          ${names
            .map(
              (name) =>
                `<option value="${escapeHtml(name)}" ${state.filterCollaborator === name ? "selected" : ""}>${escapeHtml(name)}</option>`,
            )
            .join("")}
        </select>

        <input
          class="input"
          id="searchInput"
          placeholder="Buscar item..."
          value="${state.searchText || ""}"
        />

        <select id="sortSelect">
          <option value="created_desc" ${state.sortKey === "created_desc" ? "selected" : ""}>Mais recentes</option>
          <option value="name_asc" ${state.sortKey === "name_asc" ? "selected" : ""}>Nome (A-Z)</option>
          <option value="value_desc" ${state.sortKey === "value_desc" ? "selected" : ""}>Maior total</option>
          <option value="value_asc" ${state.sortKey === "value_asc" ? "selected" : ""}>Menor total</option>
        </select>
      </div>
    </div>
  </div>
  `;
}

export function renderItemTable(items, sortKey) {
  const churrasco = sortItems(items.filter(isChurrasco), sortKey);
  const groupedOthers = groupShoppingItemsByCategory(
    items.filter((it) => !isChurrasco(it)),
  ).map((group) => ({
    ...group,
    items: sortItems(group.items, sortKey),
  }));

  const generalBlocks = groupedOthers.length
    ? groupedOthers
    : [{ category: "Geral", items: [] }];

  return `
    <div class="table-list-wrap">
      ${generalBlocks
        .map((group) =>
          renderTableBlock({
            title: `Lista de Compras • ${group.category}`,
            items: group.items,
            showCategory: true,
          }),
        )
        .join("")}
      ${renderTableBlock({
        title: "Itens por peso (Carnes, queijos e etc.)",
        items: churrasco,
        showCategory: false,
      })}
    </div>
  `;
}

export function renderItemMobileList(items, sortKey) {
  const churrasco = sortItems(items.filter(isChurrasco), sortKey);
  const groupedOthers = groupShoppingItemsByCategory(
    items.filter((it) => !isChurrasco(it)),
  ).map((group) => ({
    ...group,
    items: sortItems(group.items, sortKey),
  }));

  const generalBlocks = groupedOthers.length
    ? groupedOthers
    : [{ category: "Geral", items: [] }];

  const renderMobileBlock = (title, blockItems, showCategory) => {
    const { qtd, total } = sumTotals(blockItems);
    const qtdLabel = showCategory
      ? `${qtd.toLocaleString("pt-BR")} un`
      : formatQuantidade(qtd, "Churrasco");

    const header = `
      <div class="card section only-mobile" style="margin-top:12px">
        <div class="row space-between">
          <h2>${title}</h2>
          <div class="muted" style="font-size:12px">${blockItems.length} item(ns)</div>
        </div>
      </div>
    `;

    return `
      ${header}
      <div class="mobile-list" aria-label="Lista mobile ${title}">
        ${blockItems
          .map((it) => {
            const totalItem = totalOfItem(it);
            const isBought = it.status === "COMPRADO";
            const next = isBought ? "PENDENTE" : "COMPRADO";
            const qtdDisplay = isChurrasco(it)
              ? formatQuantidade(it.quantidade, it.categoria)
              : `${Number(it.quantidade || 0).toLocaleString("pt-BR")} un`;

            const normalizedCategory = displayGeneralCategory(it);
            const categoria =
              normalizedCategory && normalizedCategory !== "Geral"
                ? normalizedCategory
                : "";

            return `
            <div class="mcard ${isBought ? "row-bought" : ""}">
              <div class="mcard-inner">
                <div class="mcard-header">
                  <div class="mname">${it.nome}</div>
                  <div class="mtotal">
                    <div class="label">Total</div>
                    <div class="value">${brl(totalItem)}</div>
                  </div>
                </div>

                <div class="mmeta">
                  ${showCategory && categoria ? `<span>${categoria}</span>` : ""}
                  <span>Por: <b>${collabName(it)}</b></span>
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
      </div>
    `;
  };

  return `
    <div class="mobile-list-wrap">
      ${generalBlocks
        .map((group) =>
          renderMobileBlock(
            `Lista de Compras • ${group.category}`,
            group.items,
            true,
          ),
        )
        .join("")}
      ${renderMobileBlock("Itens por peso (Carnes, queijos e etc.)", churrasco, false)}
    </div>
  `;
}
