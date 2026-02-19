// src/app.js
import { sb } from "./config/supabase.js";
import { getTheme, setTheme, qs, qsa } from "./utils/ui.js";
import { brl, num, formatQuantidade, isPesoCategoria } from "./utils/format.js";
import { addMonths, monthKey, periodName } from "./utils/period.js";
import {
  classifyShoppingCategory,
  getShoppingCategories,
  normalizeShoppingCategory,
  registerShoppingCategoryCorrection,
  setSharedShoppingCategoryCorrections,
} from "./utils/shoppingCategories.js";

import { mountToast } from "./components/toast.js";
import { renderHeader } from "./components/header.js";
import { renderDashboard } from "./components/dashboard.js";
import { renderBudgetPanel } from "./components/budget.js";
import { renderCollaboratorsSummary } from "./components/collaborators.js";
import {
  renderItemFormModal,
  openModal,
  closeModal,
} from "./components/itemForm.js";
import {
  renderItemListControls,
  renderItemTable,
  renderItemMobileList,
} from "./components/itemList.js";
import {
  renderAnalytics,
  buildCharts,
  updateCharts,
} from "./components/analytics.js";
import { renderAuditLogSection } from "./components/audit.js";

import { ensurePeriod, listRecentPeriods } from "./services/periods.js";
import { getErrorMessage } from "./services/db.js";
import {
  fetchItems,
  addItem,
  updateItem,
  deleteItem,
  bulkZeroPrices,
  bulkDeleteByPeriod,
  restoreDeletedByPeriod,
  restoreDeletedItem,
  countDeletedByPeriod,
  purgeDeletedByPeriod,
  getItemsCapabilities,
  copyItemsToPeriod,
  listAuditLogsByPeriod,
} from "./services/items.js";
import {
  fetchSharedCategoryCorrections,
  getCategoryLearningCapabilities,
  upsertSharedCategoryCorrection,
} from "./services/categoryLearning.js";

const root = document.getElementById("app");
const toast = mountToast(document.body);
const UI_PREFS_KEY = "shoppingUiPrefs";
const BUDGET_STORE_KEY = "shoppingBudgetsByPeriod";
const ALLOWED_STATUS_FILTERS = new Set(["ALL", "PENDENTE", "COMPRADO"]);
const ALLOWED_SORT_KEYS = new Set(["name_asc", "value_desc", "value_asc", "created_desc"]);

function safeStatusFilter(value) {
  return ALLOWED_STATUS_FILTERS.has(String(value)) ? String(value) : "ALL";
}

function safeSortKey(value) {
  return ALLOWED_SORT_KEYS.has(String(value)) ? String(value) : "name_asc";
}

function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveUiPrefs() {
  const payload = {
    filterStatus: state.filterStatus,
    filterCollaborator: state.filterCollaborator,
    searchText: state.searchText,
    sortKey: state.sortKey,
  };
  localStorage.setItem(UI_PREFS_KEY, JSON.stringify(payload));
}

const uiPrefs = loadUiPrefs();

function loadBudgetStore() {
  try {
    const raw = localStorage.getItem(BUDGET_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveBudgetStore(store) {
  localStorage.setItem(BUDGET_STORE_KEY, JSON.stringify(store || {}));
}

const state = {
  theme: getTheme(),
  collaboratorName: localStorage.getItem("collaboratorName") || "",

  cursorDate: (() => {
    const saved = localStorage.getItem("cursorMonth");
    if (saved) {
      const [y, m] = saved.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  })(),

  currentPeriod: null,
  items: [],

  filterStatus: safeStatusFilter(uiPrefs.filterStatus || "ALL"),
  filterCollaborator: String(uiPrefs.filterCollaborator || "ALL"),
  searchText: String(uiPrefs.searchText || ""),
  sortKey: safeSortKey(uiPrefs.sortKey || "name_asc"),
  deletedCount: 0,
  softDeleteEnabled: false,
  auditLogEnabled: false,
  auditLogs: [],
  auditActionFilter: "ALL",
  budgets: {},
  budgetCollapsed: true,
  auditCollapsed: true,
  collapsedCategoryAnchors: {},
  sharedCategoryLearningEnabled: false,

  charts: null,
  delegatedBound: false,
};

function saveCursor() {
  localStorage.setItem("cursorMonth", monthKey(state.cursorDate));
}

function normalizeItem(it) {
  return {
    ...it,
    quantidade: Number(it.quantidade || 0),
    valor_unitario: num(it.valor_unitario ?? 0),
    categoria: normalizeShoppingCategory(it?.categoria),
  };
}

function getCollaboratorName(it) {
  const v =
    it?.criado_por_nome ??
    it?.criado_por ??
    it?.colaborador ??
    it?.usuario_nome ??
    "";

  const name = String(v).trim();
  return name || "—";
}

function normalizeNameKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // remove "(g)", "(kg)", etc.
    .replace(/\b(kg|g|un|und|unidade|unidades)\b/g, "") // remove common units
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function totalOfItem(it) {
  const qtd = Number(it.quantidade || 0);
  const unit = num(it.valor_unitario || 0);
  return isPesoCategoria(it.categoria) ? unit : qtd * unit;
}

function periodBudgetScopeKey() {
  return String(state.currentPeriod?.id || monthKey(state.cursorDate));
}

function loadBudgetsForCurrentPeriod() {
  const store = loadBudgetStore();
  const key = periodBudgetScopeKey();
  const scoped = store[key];
  return scoped && typeof scoped === "object" ? { ...scoped } : {};
}

function persistBudgetsForCurrentPeriod(nextBudgets) {
  const store = loadBudgetStore();
  const key = periodBudgetScopeKey();
  store[key] = nextBudgets || {};
  saveBudgetStore(store);
}

function resolveBudgetCategory(item) {
  const normalized = normalizeShoppingCategory(item?.categoria);
  if (normalized === "Churrasco") return "Churrasco";
  if (normalized !== "Geral") return normalized;
  const inferred = classifyShoppingCategory(item?.nome || "");
  return inferred === "Churrasco" ? "Geral" : inferred;
}

function computeBudgetRows(items) {
  const categories = getShoppingCategories();
  const spentMap = new Map(categories.map((category) => [category, 0]));

  for (const item of items || []) {
    const category = resolveBudgetCategory(item);
    const current = spentMap.get(category) || 0;
    spentMap.set(category, current + totalOfItem(item));
  }

  return categories.map((category) => {
    const spent = Number((spentMap.get(category) || 0).toFixed(2));
    const budget = Number(state.budgets?.[category] || 0);
    const hasBudget = budget > 0;
    const pct = hasBudget ? (spent / budget) * 100 : 0;
    let status = "NONE";
    if (hasBudget && pct > 100) status = "OVER";
    else if (hasBudget && pct >= 85) status = "ATTENTION";
    else if (hasBudget) status = "OK";

    return {
      category,
      budget,
      spent,
      balance: Number((budget - spent).toFixed(2)),
      status,
    };
  });
}

function buildRecurringItemSuggestions(limit = 8) {
  const map = new Map();
  for (const it of state.items || []) {
    const rawName = String(it?.nome || "").trim();
    const key = normalizeNameKey(rawName);
    if (!key || !rawName) continue;

    const prev = map.get(key) || {
      key,
      name: rawName,
      count: 0,
      createdAt: 0,
    };
    prev.count += 1;
    const createdTs = new Date(it?.created_at || 0).getTime() || 0;
    if (createdTs >= prev.createdAt) {
      prev.createdAt = createdTs;
      prev.name = rawName;
    }
    map.set(key, prev);
  }

  return Array.from(map.values())
    .sort((a, b) => (b.count - a.count) || (b.createdAt - a.createdAt))
    .slice(0, Math.max(1, Number(limit) || 8))
    .map((row) => row.name);
}

function getAdminDeletePin() {
  const fromWindow = window?.APP_ADMIN_PIN ?? window?.__APP_ADMIN_PIN__;
  const fromStorage = localStorage.getItem("adminDeletePin");
  return String(fromWindow || fromStorage || "1234");
}

function toastError(title, err, fallback) {
  toast.show({
    title,
    message: getErrorMessage(err?.cause || err, fallback),
  });
}

function parseQuantidade(raw, categoria) {
  const txt = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!txt) return null;

  const isPeso = isPesoCategoria(categoria);

  const match = isPeso
    ? txt.match(/^(\d+(?:[.,]\d+)?)(kg|g)?$/)
    : txt.match(/^(\d+(?:[.,]\d+)?)$/);

  if (!match) return null;

  let value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;

  const unit = isPeso ? match[2] || "" : "";
  if (unit === "g") value = value / 1000;

  return { value, unit, isPeso };
}

function parseCurrencyBRL(raw) {
  const cleaned = String(raw ?? "")
    .replace(/[^\d,.\-]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function bindCurrencyInputs(rootEl) {
  qsa('input[data-currency="brl"]', rootEl || document).forEach((input) => {
    if (input.dataset.boundCurrency) return;
    input.dataset.boundCurrency = "true";

    const formatFromDigits = (raw) => {
      const digits = String(raw ?? "").replace(/\D/g, "");
      const asNumber = Number(digits || 0) / 100;
      return brl(asNumber);
    };

    input.addEventListener("input", () => {
      const formatted = formatFromDigits(input.value);
      input.value = formatted;
      // mantém o cursor no final para evitar salto estranho no mobile
      input.setSelectionRange(formatted.length, formatted.length);
    });

    input.addEventListener("focus", () => {
      const formatted = formatFromDigits(input.value);
      input.value = formatted;
      input.setSelectionRange(formatted.length, formatted.length);
    });
  });
}

function computeKPIs(items) {
  const totalItems = items.length;
  const totalValue = items.reduce((a, it) => a + totalOfItem(it), 0);

  const pendingItems = items.filter((it) => it.status === "PENDENTE");
  const boughtItems = items.filter((it) => it.status === "COMPRADO");

  const pendingValue = pendingItems.reduce((a, it) => a + totalOfItem(it), 0);
  const boughtValue = boughtItems.reduce((a, it) => a + totalOfItem(it), 0);

  const progressPct =
    totalItems === 0 ? 0 : Math.round((boughtItems.length / totalItems) * 100);
  const avgItemTotal = totalItems === 0 ? 0 : totalValue / totalItems;

  return {
    totalItems,
    totalValue,
    pendingValue,
    boughtValue,
    progressPct,
    avgItemTotal,
  };
}

function computeByCollaborator(items) {
  const map = new Map();

  for (const it of items) {
    const nome = getCollaboratorName(it);
    const total = totalOfItem(it);
    const bought = it.status === "COMPRADO";

    if (!map.has(nome)) {
      map.set(nome, {
        nome,
        itens_adicionados: 0,
        itens_comprados: 0,
        gasto_comprado: 0,
      });
    }

    const row = map.get(nome);
    row.itens_adicionados += 1;

    if (bought) {
      row.itens_comprados += 1;
      row.gasto_comprado += total;
    }
  }

  return Array.from(map.values())
    .map((r) => ({ ...r, gasto_comprado: Number(r.gasto_comprado.toFixed(2)) }))
    .sort((a, b) => b.gasto_comprado - a.gasto_comprado);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function computeEconomyInsights(items) {
  const keywords = [
    "refrigerante",
    "coca",
    "guarana",
    "suco",
    "cerveja",
    "vinho",
    "energetico",
    "doce",
    "chocolate",
    "bala",
    "salgadinho",
    "batata",
    "sorvete",
    "bolo",
    "pizza",
    "hamburguer",
    "lanche",
    "snack",
  ];

  const normalizedKeywords = keywords.map(normalizeText);
  const totals = items.map((it) => totalOfItem(it));
  const totalValue = totals.reduce((a, b) => a + b, 0);
  const avgTotal = items.length ? totalValue / items.length : 0;

  const isWaste = (it) => {
    const n = normalizeText(it.nome);
    const c = normalizeText(it.categoria);
    return normalizedKeywords.some((k) => n.includes(k) || c.includes(k));
  };

  const wasteItems = items
    .filter(isWaste)
    .map((it) => ({
      name: it.nome || "—",
      total: totalOfItem(it),
    }))
    .sort((a, b) => b.total - a.total);

  const wasteTotal = wasteItems.reduce((a, b) => a + b.total, 0);
  const wastePct = totalValue ? Math.round((wasteTotal / totalValue) * 100) : 0;

  const priceyItems = items
    .map((it) => ({
      name: it.nome || "—",
      total: totalOfItem(it),
      status: it.status,
    }))
    .filter((it) => it.total >= Math.max(10, avgTotal * 1.5))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const dupesMap = new Map();
  items.forEach((it) => {
    const key = normalizeNameKey(it.nome);
    if (!key) return;
    const row = dupesMap.get(key) || { count: 0, label: it.nome };
    row.count += 1;
    row.label = it.nome;
    dupesMap.set(key, row);
  });
  const duplicates = Array.from(dupesMap.values())
    .filter((r) => r.count > 1)
    .map((r) => `${r.label} (${r.count}x)`)
    .slice(0, 5);

  const zeroPrice = items
    .filter((it) => Number(it.valor_unitario || 0) === 0)
    .map((it) => it.nome || "—")
    .slice(0, 5);

  const boughtItems = items.filter((it) => it.status === "COMPRADO");
  const boughtByCountMap = new Map();
  const boughtByValueMap = new Map();
  for (const it of boughtItems) {
    const key = normalizeNameKey(it.nome || "");
    const label = String(it.nome || "—").trim() || "—";
    if (!key) continue;

    const countRow = boughtByCountMap.get(key) || { label, count: 0 };
    countRow.count += 1;
    boughtByCountMap.set(key, countRow);

    const valueRow = boughtByValueMap.get(key) || { label, total: 0 };
    valueRow.total += totalOfItem(it);
    boughtByValueMap.set(key, valueRow);
  }

  const topBoughtByCount = Array.from(boughtByCountMap.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 10)
    .map((row) => `${row.label} • ${row.count}x`);

  const topBoughtByValue = Array.from(boughtByValueMap.values())
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 10)
    .map((row) => `${row.label} • ${brl(row.total)}`);

  const tips = [];
  if (wastePct >= 20) {
    tips.push("Supérfluos acima de 20% do total — revise prioridades.");
  } else if (wastePct >= 10) {
    tips.push("Supérfluos relevantes — considere reduzir.");
  } else {
    tips.push("Supérfluos sob controle.");
  }
  if (priceyItems.length) {
    tips.push("Há itens acima da média — compare preços ou marcas.");
  }
  if (duplicates.length) {
    tips.push("Itens duplicados — pode consolidar quantidades.");
  }
  if (zeroPrice.length) {
    tips.push("Itens com preço zerado — revise para não distorcer o total.");
  }

  return {
    wasteTotalLabel: brl(wasteTotal),
    wastePctLabel: `${wastePct}% do total`,
    wasteItems: wasteItems.slice(0, 5).map((x) => `${x.name} • ${brl(x.total)}`),
    priceyItems: priceyItems.map((x) => `${x.name} • ${brl(x.total)}`),
    duplicates,
    zeroPrice,
    topBoughtByCount,
    topBoughtByValue,
    tips,
  };
}

function computePriceBuckets(items) {
  const buckets = { at10: 0, between10and50: 0, above50: 0 };
  for (const it of items) {
    const v = num(it.valor_unitario || 0);
    if (v <= 10) buckets.at10++;
    else if (v <= 50) buckets.between10and50++;
    else buckets.above50++;
  }
  return buckets;
}

function computeStatusCounts(items) {
  const pending = items.filter((i) => i.status === "PENDENTE").length;
  const bought = items.filter((i) => i.status === "COMPRADO").length;
  return { pending, bought };
}

function applyFilters() {
  let arr = [...state.items];

  if (state.filterStatus !== "ALL") {
    arr = arr.filter((it) => it.status === state.filterStatus);
  }

  if (state.filterCollaborator !== "ALL") {
    arr = arr.filter(
      (it) => getCollaboratorName(it) === String(state.filterCollaborator),
    );
  }

  const q = (state.searchText || "").trim().toLowerCase();
  if (q) {
    arr = arr.filter((it) => (it.nome || "").toLowerCase().includes(q));
  }

  switch (state.sortKey) {
    case "name_asc":
      arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      break;
    case "value_desc":
      arr.sort((a, b) => totalOfItem(b) - totalOfItem(a));
      break;
    case "value_asc":
      arr.sort((a, b) => totalOfItem(a) - totalOfItem(b));
      break;
    case "created_desc":
    default:
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }

  return arr;
}

function rerenderListOnly() {
  const listWrap = document.querySelector(".mobile-list-wrap");
  if (!listWrap) return;
  const filtered = applyFilters();
  listWrap.outerHTML = renderItemMobileList(
    filtered,
    state.sortKey,
    state.collapsedCategoryAnchors,
  );
}

function rerenderTableOnly() {
  const tableWrap = document.querySelector(".table-list-wrap");
  if (!tableWrap) return;
  const filtered = applyFilters();
  tableWrap.outerHTML = renderItemTable(
    filtered,
    state.sortKey,
    state.collapsedCategoryAnchors,
  );
}

function renderNameGate() {
  root.innerHTML = `
    <div class="container">
      <div class="card section">
        <h1>Lista de Compras - Carnaval 2026</h1>
        <div class="muted" style="margin-top:6px">Aplicação pública. Informe seu nome para colaborar.</div>

        <div class="hr"></div>

        <form id="nameForm" class="grid" style="max-width:420px">
          <input class="input" name="nome" placeholder="Seu nome (ex: João)" required />
          <button class="btn primary" type="submit">Entrar</button>
        </form>

        <div class="muted" style="font-size:12px;margin-top:12px">
          O nome fica salvo apenas no seu navegador (localStorage).
        </div>
      </div>
    </div>
  `;

  const form = qs("#nameForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const nome = String(fd.get("nome") || "").trim();
    if (!nome) return;

    state.collaboratorName = nome;
    localStorage.setItem("collaboratorName", nome);

    await loadDataForPeriod();
    renderApp();
  });
}

async function loadDataForPeriod() {
  state.currentPeriod = await ensurePeriod(state.cursorDate);
  const caps = await getItemsCapabilities();
  state.softDeleteEnabled = Boolean(caps.softDelete);
  state.auditLogEnabled = Boolean(caps.auditLog);
  const learningCaps = await getCategoryLearningCapabilities();
  state.sharedCategoryLearningEnabled = Boolean(
    learningCaps.sharedCategoryLearning,
  );
  if (state.sharedCategoryLearningEnabled) {
    const sharedMap = await fetchSharedCategoryCorrections(800);
    setSharedShoppingCategoryCorrections(sharedMap);
  } else {
    setSharedShoppingCategoryCorrections({});
  }

  const raw = await fetchItems(state.currentPeriod.id);
  state.items = (raw || []).map(normalizeItem);
  state.deletedCount = await countDeletedByPeriod(state.currentPeriod.id);
  if (state.auditLogEnabled) {
    try {
      state.auditLogs = await listAuditLogsByPeriod(state.currentPeriod.id, 50);
    } catch {
      state.auditLogs = [];
    }
  } else {
    state.auditLogs = [];
  }
  state.budgets = loadBudgetsForCurrentPeriod();

  const collabFilter = String(state.filterCollaborator || "ALL");
  if (collabFilter !== "ALL") {
    const exists = state.items.some((it) => getCollaboratorName(it) === collabFilter);
    if (!exists) {
      state.filterCollaborator = "ALL";
      saveUiPrefs();
    }
  }
}

async function computeMonthlySeries() {
  const periods = await listRecentPeriods(12);
  const sorted = [...periods].sort(
    (a, b) => new Date(a.data_inicio) - new Date(b.data_inicio),
  );
  const last = sorted.slice(-6);
  const ids = last.map((p) => p.id);

  const res = await sb
    .from("items")
    .select("periodo_id,quantidade,valor_unitario")
    .in("periodo_id", ids);

  if (res.error) throw res.error;

  const items = (res.data || []).map(normalizeItem);
  const map = new Map(ids.map((id) => [id, 0]));

  for (const it of items) {
    map.set(it.periodo_id, (map.get(it.periodo_id) || 0) + totalOfItem(it));
  }

  return {
    labels: last.map((p) => p.nome),
    values: last.map((p) => Number((map.get(p.id) || 0).toFixed(2))),
  };
}

function renderApp() {
  const periodLabel = state.currentPeriod?.nome || periodName(state.cursorDate);
  const userName = state.collaboratorName || "—";
  const filtered = applyFilters();
  const kpis = computeKPIs(state.items);
  const budgetRows = computeBudgetRows(state.items);
  const totalBudget = budgetRows.reduce((acc, row) => acc + Number(row.budget || 0), 0);
  const totalSpent = budgetRows.reduce((acc, row) => acc + Number(row.spent || 0), 0);
  const overBudgetCategories = budgetRows
    .filter((row) => row.status === "OVER")
    .map((row) => row.category);
  const byCollab = computeByCollaborator(state.items);
  const economy = computeEconomyInsights(state.items);

  root.innerHTML = `
    <div class="container">
      ${renderHeader({
        periodLabel,
        userName,
        theme: state.theme,
        deletedCount: state.deletedCount,
        softDeleteEnabled: state.softDeleteEnabled,
        overBudgetCount: overBudgetCategories.length,
        overBudgetTitle: overBudgetCategories.join(" • "),
      })}

      <div style="margin-top:12px">
        ${renderDashboard(kpis)}
        ${renderBudgetPanel({
          rows: budgetRows,
          totalSpent,
          totalBudget,
          collapsed: state.budgetCollapsed,
        })}
        ${renderCollaboratorsSummary(byCollab)}
      </div>

      <div class="grid main" style="margin-top:12px">
        <div>
          ${renderItemListControls(state)}
          ${renderItemTable(filtered, state.sortKey, state.collapsedCategoryAnchors)}
          ${renderItemMobileList(filtered, state.sortKey, state.collapsedCategoryAnchors)}
        </div>
      </div>

      <div style="margin-top:12px">
        ${renderAnalytics(economy)}
      </div>

      <div style="margin-top:12px">
        ${renderAuditLogSection({
          enabled: state.auditLogEnabled,
          logs: state.auditLogs,
          actionFilter: state.auditActionFilter,
          collapsed: state.auditCollapsed,
        })}
      </div>

      ${renderItemFormModal()}
    </div>
  `;

  // Troca "Sair" por "Trocar nome"
  const logoutBtn = qs('[data-action="logout"]');
  if (logoutBtn) {
    logoutBtn.textContent = "Trocar nome";
    logoutBtn.dataset.action = "change-name";
  }

  // Charts
  if (!state.charts) {
    state.charts = buildCharts();
  } else {
    try {
      state.charts.priceChart.destroy();
      state.charts.monthlyChart.destroy();
      state.charts.statusChart.destroy();
    } catch {}
    state.charts = buildCharts();
  }

  (async () => {
    try {
      const priceBuckets = computePriceBuckets(state.items);
      const statusCounts = computeStatusCounts(state.items);
      const monthlySeries = await computeMonthlySeries();
      updateCharts({
        charts: state.charts,
        priceBuckets,
        monthlySeries,
        statusCounts,
      });
    } catch (err) {
      toastError("Charts", err, "Falha ao montar gráficos");
    }
  })();

  if (!state.delegatedBound) {
    bindDelegatedEvents();
    state.delegatedBound = true;
  }

  bindPerRenderInputs();
}

function bindPerRenderInputs() {
  // filtros
  qsa("[data-filter]").forEach((b) => {
    b.addEventListener("click", () => {
      state.filterStatus = safeStatusFilter(b.dataset.filter);
      saveUiPrefs();
      renderApp();
    });
  });

  // busca (sem travar)
  const collaboratorFilter = qs("#collaboratorFilter");
  if (collaboratorFilter) {
    collaboratorFilter.addEventListener("change", () => {
      state.filterCollaborator = collaboratorFilter.value || "ALL";
      saveUiPrefs();
      rerenderTableOnly();
      rerenderListOnly();
    });
  }

  // busca (sem travar)
  const s = qs("#searchInput");
  if (s) {
    s.addEventListener("input", () => {
      state.searchText = s.value;
      saveUiPrefs();
      rerenderTableOnly();
      rerenderListOnly();
    });
  }

  // sort
  const sort = qs("#sortSelect");
  if (sort) {
    sort.addEventListener("change", () => {
      state.sortKey = safeSortKey(sort.value);
      saveUiPrefs();
      renderApp();
    });
  }

  const auditActionFilter = qs("#auditActionFilter");
  if (auditActionFilter) {
    auditActionFilter.addEventListener("change", () => {
      state.auditActionFilter = String(auditActionFilter.value || "ALL");
      renderApp();
    });
  }

  const toggleAuditBtn = qs("#toggleAuditPanel");
  if (toggleAuditBtn) {
    toggleAuditBtn.addEventListener("click", () => {
      state.auditCollapsed = !state.auditCollapsed;
      saveUiPrefs();
      renderApp();
    });
  }

  bindCurrencyInputs(root);

  qsa(".budget-input").forEach((input) => {
    input.addEventListener("change", () => {
      const category = String(input.dataset.budgetCategory || "").trim();
      if (!category) return;
      const raw = parseCurrencyBRL(input.value || 0);
      const value = Number.isFinite(raw) && raw > 0 ? Number(raw.toFixed(2)) : 0;
      if (value > 0) {
        state.budgets = { ...state.budgets, [category]: value };
      } else {
        const next = { ...state.budgets };
        delete next[category];
        state.budgets = next;
      }
      persistBudgetsForCurrentPeriod(state.budgets);
      renderApp();
    });
  });

  const toggleBudgetBtn = qs("#toggleBudgetPanel");
  if (toggleBudgetBtn) {
    toggleBudgetBtn.addEventListener("click", () => {
      state.budgetCollapsed = !state.budgetCollapsed;
      saveUiPrefs();
      renderApp();
    });
  }

  // submit modal form
  const form = qs("#itemForm");
  if (form) {
    const nameInput = form.querySelector('input[name="nome"]');
    const qtdInput = form.querySelector('input[name="quantidade"]');
    const categoriaSelect = form.querySelector('select[name="categoria"]');
    const tipoSelect = form.querySelector('select[name="tipo"]');
    const categoriaAutoHint = form.querySelector("#categoriaAutoHint");
    const itemSuggestionsWrap = form.querySelector("#itemSuggestionsWrap");
    const itemSuggestionsList = form.querySelector("#itemSuggestions");
    let autoUpdatingCategory = false;

    const setAutoHint = (category) => {
      if (!categoriaAutoHint) return;
      if (!category || category === "Churrasco") {
        categoriaAutoHint.textContent = "";
        return;
      }
      categoriaAutoHint.textContent = `Categoria automática: ${category}`;
    };

    const currentId = () =>
      String(form.querySelector('input[name="id"]')?.value || "").trim();

    const classifyCurrentName = () => classifyShoppingCategory(nameInput?.value || "");

    const refreshCategorySuggestion = ({ applyAuto = true } = {}) => {
      if (!categoriaSelect) return;

      const selectedCategory = normalizeShoppingCategory(categoriaSelect.value);
      const rawName = String(nameInput?.value || "").trim();
      if (!rawName) {
        form.dataset.autoCategory = "Geral";
        setAutoHint("");
        return;
      }

      const suggested = classifyCurrentName();
      form.dataset.autoCategory = suggested;

      if (selectedCategory === "Churrasco") {
        setAutoHint("");
        return;
      }

      setAutoHint(suggested);

      const isEditing = Boolean(currentId());
      const isManual = form.dataset.categoryManual === "true";
      if (!applyAuto || isEditing || isManual) return;

      autoUpdatingCategory = true;
      categoriaSelect.value = suggested;
      syncTipo();
      autoUpdatingCategory = false;
    };

    const syncTipo = () => {
      if (!categoriaSelect || !tipoSelect) return;
      const normalizedCategory = normalizeShoppingCategory(categoriaSelect.value);
      const isPeso = isPesoCategoria(normalizedCategory);
      categoriaSelect.value = normalizedCategory;
      tipoSelect.value = isPeso ? "PESO" : "UNIDADE";
      if (qtdInput) {
        qtdInput.placeholder = isPeso ? "Ex: 1kg ou 0.5g" : "Ex: 2 ou 2,5";
      }
    };

    const renderRecurringSuggestions = () => {
      if (!itemSuggestionsWrap || !itemSuggestionsList) return;
      const isEditing = Boolean(currentId());
      if (isEditing) {
        itemSuggestionsWrap.style.display = "none";
        itemSuggestionsList.innerHTML = "";
        return;
      }

      const suggestions = buildRecurringItemSuggestions(8);
      if (!suggestions.length) {
        itemSuggestionsWrap.style.display = "none";
        itemSuggestionsList.innerHTML = "";
        return;
      }

      itemSuggestionsWrap.style.display = "block";
      itemSuggestionsList.innerHTML = suggestions
        .map(
          (name) =>
            `<button type="button" class="item-suggest-btn" data-suggest-item="${escapeHtml(name)}">${escapeHtml(name)}</button>`,
        )
        .join("");

      itemSuggestionsList.querySelectorAll("[data-suggest-item]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const suggestedName = String(btn.dataset.suggestItem || "").trim();
          if (!suggestedName || !nameInput) return;
          nameInput.value = suggestedName;
          form.dataset.categoryManual = "false";
          refreshCategorySuggestion();
          nameInput.focus();
          nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length);
        });
      });
    };

    if (categoriaSelect) {
      categoriaSelect.addEventListener("change", () => {
        syncTipo();
        if (!autoUpdatingCategory) {
          form.dataset.categoryManual = "true";
        }
        refreshCategorySuggestion({ applyAuto: false });
      });
      syncTipo();
    }
    if (nameInput) {
      nameInput.addEventListener("input", () => refreshCategorySuggestion());
    }
    form.addEventListener("shopping:modal-opened", () => {
      refreshCategorySuggestion({ applyAuto: false });
      renderRecurringSuggestions();
    });

    bindCurrencyInputs(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(form);
        const id = fd.get("id");

        const payload = {
          nome: String(fd.get("nome") || "").trim(),
          quantidade: 0,
          valor_unitario: parseCurrencyBRL(fd.get("valor_unitario") || 0),
          categoria: normalizeShoppingCategory(fd.get("categoria") || "Geral"),
          status: String(fd.get("status") || "PENDENTE"),
        };

        if (!payload.nome) {
          toast.show({
            title: "Validação",
            message: "Informe o nome do item.",
          });
          return;
        }

        const autoCategory = classifyShoppingCategory(payload.nome);
        const selectedCategory = normalizeShoppingCategory(payload.categoria);
        const suggestedInForm = normalizeShoppingCategory(
          form.dataset.autoCategory || autoCategory,
        );
        const isEditing = Boolean(String(id || "").trim());
        const manualCategorySelected = form.dataset.categoryManual === "true";

        if (selectedCategory !== "Churrasco") {
          if (isEditing) {
            payload.categoria =
              selectedCategory === "Geral" ? autoCategory : selectedCategory;
          } else {
            const keepManualCategory =
              manualCategorySelected &&
              selectedCategory !== "Geral" &&
              selectedCategory !== suggestedInForm;
            payload.categoria = keepManualCategory
              ? selectedCategory
              : autoCategory;
          }
        } else {
          payload.categoria = "Churrasco";
        }

        const shouldLearnCategory =
          manualCategorySelected &&
          payload.categoria !== "Churrasco" &&
          payload.categoria !== "Geral";

        const isPeso = isPesoCategoria(payload.categoria);
        if (!isPeso) {
          const key = normalizeNameKey(payload.nome);
          const exists = state.items.some((it) => {
            if (id && it.id === id) return false;
            const itIsPeso = isPesoCategoria(it.categoria);
            if (itIsPeso) return false;
            return normalizeNameKey(it.nome) === key;
          });

          if (exists) {
            toast.show({
              title: "Duplicado",
              message: "Esse item já existe na Lista de Compras.",
            });
            return;
          }
        }

        const qtdParsed = parseQuantidade(
          fd.get("quantidade"),
          payload.categoria,
        );
        if (!qtdParsed) {
          toast.show({
            title: "Validação",
            message:
              isPesoCategoria(payload.categoria)
                ? "Quantidade inválida. Use ex: 1kg ou 0.5g."
                : "Quantidade inválida. Use apenas números (ex: 2 ou 2,5).",
          });
          return;
        }
        payload.quantidade = qtdParsed.value;

        if (id) {
          const updated = normalizeItem(await updateItem(id, payload));
          state.items = state.items.map((x) => (x.id === id ? updated : x));
          toast.show({ title: "Salvo", message: "Item atualizado." });
        } else {
          const created = normalizeItem(
            await addItem({
              ...payload,
              periodo_id: state.currentPeriod.id,
              criado_por_nome: state.collaboratorName || "Colaborador",
            }),
          );
          state.items = [created, ...state.items];
          toast.show({ title: "Adicionado", message: "Item criado." });
        }

        if (shouldLearnCategory) {
          registerShoppingCategoryCorrection(payload.nome, payload.categoria);
          if (state.sharedCategoryLearningEnabled) {
            upsertSharedCategoryCorrection({
              name: payload.nome,
              category: payload.categoria,
              collaboratorName: state.collaboratorName,
            }).catch(() => {});
          }
        }

        closeModal();
        renderApp();
      } catch (err) {
        toastError("Erro", err, "Falha ao salvar item.");
      }
    });
  }

  const backdrop = qs("#modalBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
}

function bindDelegatedEvents() {
  root.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;

    const action = el.dataset.action;

    try {
      if (action === "change-name") {
        localStorage.removeItem("collaboratorName");
        state.collaboratorName = "";
        state.charts = null;
        renderNameGate();
        return;
      }

      if (action === "toggle-theme") {
        state.theme = state.theme === "dark" ? "light" : "dark";
        setTheme(state.theme);
        renderApp();
        return;
      }

      if (action === "scroll-top") {
        const target = document.querySelector('[data-action="open-add"]');
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      if (action === "scroll-category") {
        const category = String(el.dataset.category || "").trim();
        if (!category) return;

        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const preferredSelector = isMobile
          ? `.only-mobile[data-category-anchor="${category}"]`
          : `.only-desktop[data-category-anchor="${category}"]`;

        const target =
          document.querySelector(preferredSelector) ||
          document.querySelector(`[data-category-anchor="${category}"]`);

        if (!target) {
          toast.show({
            title: "Categoria",
            message: "Categoria não encontrada na lista atual.",
          });
          return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "toggle-category-section") {
        const anchor = String(el.dataset.categoryAnchor || "").trim();
        if (!anchor) return;
        const current = state.collapsedCategoryAnchors?.[anchor] !== false;
        state.collapsedCategoryAnchors = {
          ...state.collapsedCategoryAnchors,
          [anchor]: !current,
        };
        renderApp();
        return;
      }

      if (action === "prev-month") {
        state.cursorDate = addMonths(state.cursorDate, -1);
        saveCursor();
        await loadDataForPeriod();
        renderApp();
        return;
      }

      if (action === "next-month") {
        state.cursorDate = addMonths(state.cursorDate, +1);
        saveCursor();
        await loadDataForPeriod();
        renderApp();
        return;
      }

      if (action === "open-add") {
        openModal({
          title: "Adicionar item",
          subtitle: `Período: ${state.currentPeriod.nome}`,
          hint: `Colaborador: ${state.collaboratorName}`,
          data: null,
        });
        const form = qs("#itemForm");
        if (form?.valor_unitario) {
          bindCurrencyInputs(form);
          form.valor_unitario.value = brl(
            parseCurrencyBRL(form.valor_unitario.value),
          );
        }
        return;
      }

      if (action === "edit") {
        const id = el.dataset.id;
        const it = state.items.find((x) => x.id === id);
        if (!it) return;

        openModal({
          title: "Editar item",
          subtitle: `Período: ${state.currentPeriod.nome}`,
          hint: `Criado por: ${getCollaboratorName(it)}`,
          data: it,
        });
        const form = qs("#itemForm");
        if (form?.valor_unitario) {
          bindCurrencyInputs(form);
          form.valor_unitario.value = brl(
            parseCurrencyBRL(form.valor_unitario.value),
          );
        }
        return;
      }

      if (action === "delete") {
        const id = el.dataset.id;
        const deleteMsg = state.softDeleteEnabled
          ? "Mover este item para a lixeira?"
          : "Seu banco não tem lixeira. Excluir permanentemente este item?";
        if (!confirm(deleteMsg)) return;

        const deletedItem = state.items.find((x) => x.id === id) || null;
        await deleteItem(id, state.collaboratorName, "Remoção individual");
        state.items = state.items.filter((x) => x.id !== id);
        state.deletedCount = await countDeletedByPeriod(state.currentPeriod.id);
        if (state.softDeleteEnabled && deletedItem) {
          toast.show({
            title: "Lixeira",
            message: "Item movido para a lixeira.",
            actionLabel: "Desfazer",
            onAction: async () => {
              const restored = await restoreDeletedItem(
                id,
                state.collaboratorName,
              );
              if (!restored) {
                toast.show({
                  title: "Desfazer",
                  message: "Não foi possível restaurar o item.",
                });
                return;
              }
              state.items = [normalizeItem(restored), ...state.items];
              state.deletedCount = await countDeletedByPeriod(
                state.currentPeriod.id,
              );
              renderApp();
              toast.show({
                title: "Restaurado",
                message: "Item restaurado da lixeira.",
              });
            },
            duration: 6000,
          });
        } else {
          toast.show({
            title: state.softDeleteEnabled ? "Lixeira" : "Exclusão permanente",
            message: state.softDeleteEnabled
              ? "Item movido para a lixeira."
              : "Item removido permanentemente.",
          });
        }
        if (state.auditLogEnabled) {
          try {
            state.auditLogs = await listAuditLogsByPeriod(state.currentPeriod.id, 50);
          } catch {}
        }
        renderApp();
        return;
      }

      if (action === "toggle-status") {
        const id = el.dataset.id;
        const next = el.dataset.next;

        const updated = normalizeItem(await updateItem(id, { status: next }));
        state.items = state.items.map((x) => (x.id === id ? updated : x));
        renderApp();
        return;
      }

      // editar célula (lápis)
      if (action === "edit-cell") {
        const id = el.dataset.id;
        const field = el.dataset.field; // quantidade | valor_unitario
        const it = state.items.find((x) => x.id === id);
        if (!it) return;

        const cell = el.closest(".editing-cell");
        if (!cell) return;
        if (cell.querySelector("input")) return;

        const currentValue =
          field === "quantidade"
            ? formatQuantidade(it.quantidade ?? 0, it.categoria)
            : brl(it.valor_unitario || 0);

        cell.innerHTML = `
          <input
            class="input cell-input"
            type="text"
            inputmode="decimal"
            placeholder="${field === "quantidade" ? "Ex: 1kg ou 0.5g" : "0,00"}"
            value="${currentValue}"
            ${field === "valor_unitario" ? 'data-currency="brl"' : ""}
          />
        `;

        const inp = cell.querySelector("input");
        if (field === "valor_unitario") {
          bindCurrencyInputs(cell);
        }
        let committed = false;

        const saveInline = async () => {
          if (committed) return;
          committed = true;

          const raw = String(inp?.value ?? "").trim();
          const patch = {};

          if (!raw) {
            if (field === "quantidade") {
              patch.quantidade = 0;
            } else {
              patch.valor_unitario = 0;
            }
          } else if (field === "quantidade") {
            const qtdParsed = parseQuantidade(raw, it.categoria);
            if (!qtdParsed) {
              toast.show({
                title: "Validação",
                message:
                  isPesoCategoria(it.categoria)
                    ? "Quantidade inválida. Use ex: 1kg ou 0.5g."
                    : "Quantidade inválida. Use apenas números (ex: 2 ou 2,5).",
              });
              renderApp();
              return;
            }
            patch.quantidade = qtdParsed.value;
          } else {
            patch.valor_unitario = parseCurrencyBRL(raw);
          }

          const updated = normalizeItem(await updateItem(id, patch));
          state.items = state.items.map((x) => (x.id === id ? updated : x));
          renderApp();
        };

        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            saveInline();
          }
          if (ev.key === "Escape") {
            ev.preventDefault();
            committed = true;
            renderApp();
          }
        });

        inp.addEventListener("blur", () => {
          saveInline();
        });

        inp.focus();
        inp.select();
        return;
      }

      if (action === "zero-prices") {
        if (!confirm(`Zerar preços de ${state.currentPeriod.nome}?`)) return;

        await bulkZeroPrices(state.currentPeriod.id, state.collaboratorName);
        state.items = state.items.map((it) =>
          normalizeItem({ ...it, valor_unitario: 0 }),
        );
        if (state.auditLogEnabled) {
          try {
            state.auditLogs = await listAuditLogsByPeriod(state.currentPeriod.id, 50);
          } catch {}
        }
        toast.show({ title: "Ok", message: "Preços zerados no mês." });
        renderApp();
        return;
      }

      if (action === "delete-month") {
        if (!state.softDeleteEnabled) {
          toast.show({
            title: "Lixeira indisponível",
            message:
              "Seu banco ainda não suporta lixeira. Aplique a migração de soft delete antes de usar essa ação.",
          });
          return;
        }

        const periodNameValue = String(state.currentPeriod?.nome || "").trim();
        const expectedPhrase = `APAGAR ${periodNameValue}`;
        const typedPhrase = prompt(
          `Confirmação obrigatória.\nDigite exatamente:\n${expectedPhrase}`,
        );
        if (typedPhrase === null) {
          toast.show({ title: "Cancelado", message: "Ação cancelada." });
          return;
        }
        if (String(typedPhrase).trim() !== expectedPhrase) {
          toast.show({
            title: "Frase inválida",
            message: "Confirmação não confere. Nada foi alterado.",
          });
          return;
        }

        const typedPin = prompt("Digite o PIN admin para continuar:");
        if (typedPin === null) {
          toast.show({ title: "Cancelado", message: "Ação cancelada." });
          return;
        }
        if (String(typedPin).trim() !== getAdminDeletePin()) {
          toast.show({
            title: "PIN inválido",
            message: "PIN incorreto. Nada foi alterado.",
          });
          return;
        }

        await bulkDeleteByPeriod(
          state.currentPeriod.id,
          state.collaboratorName,
          `Lixeira mensal (${state.currentPeriod.nome})`,
        );

        await loadDataForPeriod();
        toast.show({ title: "Lixeira", message: "Lista do mês movida para lixeira." });
        renderApp();
        return;
      }

      if (action === "restore-month") {
        if (!state.softDeleteEnabled) {
          toast.show({
            title: "Restaurar indisponível",
            message:
              "Seu banco ainda não suporta restauração. Aplique a migração de soft delete.",
          });
          return;
        }

        const restored = await restoreDeletedByPeriod(
          state.currentPeriod.id,
          state.collaboratorName,
        );
        if (restored <= 0) {
          toast.show({
            title: "Restaurar",
            message: "Nenhum item restaurado para este mês.",
          });
          return;
        }
        await loadDataForPeriod();
        toast.show({
          title: "Restaurado",
          message: `${restored} item(ns) restaurado(s) da lixeira.`,
        });
        renderApp();
        return;
      }

      if (action === "purge-month") {
        if (!state.softDeleteEnabled) {
          toast.show({
            title: "Exclusão definitiva indisponível",
            message:
              "Seu banco ainda não suporta lixeira. Aplique a migração de soft delete.",
          });
          return;
        }

        if (state.deletedCount <= 0) {
          toast.show({
            title: "Lixeira vazia",
            message: "Não há itens deletados para apagar definitivamente.",
          });
          return;
        }

        const periodNameValue = String(state.currentPeriod?.nome || "").trim();
        const expectedPhrase = `APAGAR DEFINITIVO ${periodNameValue}`;
        const typedPhrase = prompt(
          `Ação irreversível.\nDigite exatamente:\n${expectedPhrase}`,
        );
        if (typedPhrase === null) {
          toast.show({ title: "Cancelado", message: "Ação cancelada." });
          return;
        }
        if (String(typedPhrase).trim() !== expectedPhrase) {
          toast.show({
            title: "Frase inválida",
            message: "Confirmação não confere. Nada foi alterado.",
          });
          return;
        }

        const typedPin = prompt("Digite o PIN admin para exclusão definitiva:");
        if (typedPin === null) {
          toast.show({ title: "Cancelado", message: "Ação cancelada." });
          return;
        }
        if (String(typedPin).trim() !== getAdminDeletePin()) {
          toast.show({
            title: "PIN inválido",
            message: "PIN incorreto. Nada foi alterado.",
          });
          return;
        }

        const purged = await purgeDeletedByPeriod(
          state.currentPeriod.id,
          state.collaboratorName,
          `Limpeza definitiva (${state.currentPeriod.nome})`,
        );

        await loadDataForPeriod();
        toast.show({
          title: "Exclusão definitiva",
          message:
            purged > 0
              ? `${purged} item(ns) removido(s) definitivamente.`
              : "Nenhum item foi removido definitivamente.",
        });
        renderApp();
        return;
      }

      if (action === "copy-next") {
        const nextDate = addMonths(state.cursorDate, +1);
        const nextPeriod = await ensurePeriod(nextDate);

        const qtd = await copyItemsToPeriod({
          fromPeriodId: state.currentPeriod.id,
          toPeriodId: nextPeriod.id,
          createdByName: state.collaboratorName,
        });

        toast.show({
          title: "Copiado",
          message: `${qtd} item(ns) copiado(s) para ${nextPeriod.nome}.`,
        });
        return;
      }

      if (action === "close-modal") {
        closeModal();
        return;
      }
    } catch (err) {
      toastError("Erro", err, "Algo deu errado.");
    }
  });
}

async function boot() {
  setTheme(state.theme);

  if (!state.collaboratorName) {
    renderNameGate();
    return;
  }

  await loadDataForPeriod();
  renderApp();
}

boot().catch((err) => {
  root.innerHTML = `<div class="container"><div class="card section">
    <h1>Erro ao iniciar</h1><div class="muted" style="margin-top:8px">${getErrorMessage(err?.cause || err, "Falha ao iniciar aplicação.")}</div>
  </div></div>`;
});
