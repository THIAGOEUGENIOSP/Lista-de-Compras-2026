import { formatQuantidade, isPesoCategoria } from "../utils/format.js";
import {
  getShoppingCategories,
  normalizeShoppingCategory,
} from "../utils/shoppingCategories.js";

function icon(name) {
  const names = {
    add: "badge-plus",
    box: "package",
    hash: "hash",
    tag: "tag",
    clock: "clock",
    user: "user-round",
    close: "x",
    check: "check",
    chevronDown: "chevron-down",
    chevronUp: "chevron-up",
  };

  return `<i class="form-icon" data-lucide="${names[name] || names.box}" aria-hidden="true"></i>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildCategoryOptions() {
  return getShoppingCategories()
    .map((category) => {
      const label =
        category === "Churrasco"
          ? "Churrasco (Itens por peso: carnes, queijos e etc.)"
          : category;
      return `<option value="${category}">${label}</option>`;
    })
    .join("");
}

export function renderItemFormModal() {
  return `
  <div class="modal-backdrop" id="modalBackdrop">
    <div class="card modal item-modal">
      <div class="item-modal-head">
        <div class="item-title-wrap">
          <span class="item-title-icon">${icon("add")}</span>
          <div>
            <h2 id="modalTitle" class="item-modal-title">Adicionar item</h2>
            <div class="item-modal-subtitle" id="modalSubtitle">Período: ---</div>
          </div>
        </div>
        <button class="btn small item-modal-close" data-action="close-modal" aria-label="Fechar">
          ${icon("close")}
        </button>
      </div>

      <div class="hr"></div>

      <form id="itemForm" class="grid item-form-grid">
        <div class="full form-line">
          <label class="form-label">Item <span class="required">*</span></label>
          <div class="field-control">
            <span class="field-prefix">${icon("box")}</span>
            <input class="input with-icon" name="nome" placeholder="Ex: Cerveja, Carne, Refrigerante..." required />
          </div>
          <div id="itemSuggestionsWrap" class="item-suggestions" style="display:none">
            <div class="suggestions-title">Sugestões</div>
            <div id="itemSuggestions" class="item-suggestions-list"></div>
          </div>
        </div>

        <div class="form-field compact-field">
          <label class="form-label">Quantidade <span class="required">*</span></label>
          <div class="field-control qty-control">
            <span class="field-prefix">${icon("hash")}</span>
            <input
              class="input with-icon"
              name="quantidade"
              type="text"
              inputmode="decimal"
              placeholder="Ex: 2 ou 2,5"
              required
            />
            <div class="qty-stepper">
              <button type="button" class="qty-step-btn" data-qty-increase aria-label="Aumentar quantidade">${icon("chevronUp")}</button>
              <button type="button" class="qty-step-btn" data-qty-decrease aria-label="Diminuir quantidade">${icon("chevronDown")}</button>
            </div>
          </div>
        </div>
        <div class="form-spacer" aria-hidden="true"></div>

        <div class="form-field">
          <label class="form-label">Tipo</label>
          <div class="field-control select-control">
            <span class="field-prefix">${icon("box")}</span>
            <select name="tipo">
              <option value="UNIDADE">Unidade</option>
              <option value="PESO">Peso (kg/g)</option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Categoria</label>
          <div class="field-control select-control">
            <span class="field-prefix">${icon("tag")}</span>
            <select name="categoria">
              ${buildCategoryOptions()}
            </select>
          </div>
          <div class="field-hint" id="categoriaAutoHint"></div>
        </div>

        <div class="form-field">
          <label class="form-label">Valor unitário (R$) <span class="required">*</span></label>
          <div class="field-control">
            <span class="field-prefix text-prefix">R$</span>
            <input
              class="input with-icon"
              name="valor_unitario"
              type="text"
              inputmode="decimal"
              data-currency="brl"
              value="R$ 0,00"
              required
            />
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Status</label>
          <div class="field-control select-control">
            <span class="field-prefix">${icon("clock")}</span>
            <select name="status">
              <option value="PENDENTE" selected>Pendente</option>
              <option value="COMPRADO">Comprado</option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <div class="collaborator-card">
            ${icon("user")}
            <span id="modalCollaborator">Colaborador: ---</span>
          </div>
        </div>
        <div class="form-spacer" aria-hidden="true"></div>

        <div class="full item-form-footer">
          <div class="form-note">
            <span class="note-icon">i</span>
            Campos marcados com <span class="required">*</span> são obrigatórios
          </div>
          <div class="form-actions">
            <button type="button" class="btn item-cancel-btn" data-action="close-modal">
              ${icon("close")}
              Cancelar
            </button>
            <button type="submit" class="btn primary item-save-btn" id="submitBtn">
              ${icon("check")}
              Salvar
            </button>
          </div>
        </div>

        <input type="hidden" name="id" />
      </form>
    </div>
  </div>
  `;
}

function ensureOption(selectEl, value) {
  if (!value || !selectEl) return;
  const exists = Array.from(selectEl.options).some((o) => o.value === value);
  if (exists) return;

  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = value;
  selectEl.appendChild(opt);
}

export function openModal({ title, subtitle, hint, data, periodo, colaborador }) {
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.style.display = "flex";
  document.getElementById("modalTitle").textContent = title || "Adicionar item";

  document.getElementById("modalSubtitle").innerHTML = periodo
    ? `Período: <span>${escapeHtml(periodo)}</span>`
    : "Período: ---";

  document.getElementById("modalCollaborator").innerHTML = colaborador
    ? `Colaborador: <strong>${escapeHtml(colaborador)}</strong>`
    : "Colaborador: ---";

  const form = document.getElementById("itemForm");
  form.reset();
  form.dataset.categoryManual = "false";
  form.dataset.autoCategory = "";

  if (data) {
    form.nome.value = data.nome ?? "";
    form.quantidade.value = formatQuantidade(
      data.quantidade ?? 1,
      data.categoria,
    );
    form.valor_unitario.value = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(data.valor_unitario ?? 0);

    const normalizedCategory = normalizeShoppingCategory(data.categoria);
    ensureOption(form.categoria, normalizedCategory);
    form.categoria.value = normalizedCategory;
    form.tipo.value = isPesoCategoria(normalizedCategory) ? "PESO" : "UNIDADE";

    form.id.value = data.id ?? "";
  } else {
    form.categoria.value = normalizeShoppingCategory("Geral");
    form.tipo.value = "UNIDADE";
    form.id.value = "";
    form.quantidade.value = "";
    form.valor_unitario.value = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(0);
  }

  const isPeso = isPesoCategoria(form.categoria.value);
  form.quantidade.placeholder = isPeso
    ? "Ex: 1kg ou 0.5g"
    : "Ex: 2 ou 2,5";

  form.status.value = data?.status ?? "PENDENTE";
  form.dispatchEvent(new CustomEvent("shopping:modal-opened"));

  form.nome.focus();
}

export function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.style.display = "none";
}
