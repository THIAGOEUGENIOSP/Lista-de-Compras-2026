import { sb } from "../config/supabase.js";
import {
  getErrorMessage,
  isMissingColumnError,
  isMissingTableError,
  mustOk,
} from "./db.js";
import {
  normalizeShoppingCategory,
  normalizeShoppingItemName,
} from "../utils/shoppingCategories.js";

const TABLE_NAME = "shopping_category_corrections";
let categoryLearningSupport = null;

async function hasCategoryLearningSupport() {
  if (categoryLearningSupport !== null) return categoryLearningSupport;

  const probe = await sb.from(TABLE_NAME).select("normalized_name").limit(1);
  if (!probe.error) {
    categoryLearningSupport = true;
    return true;
  }
  if (
    isMissingTableError(probe.error, TABLE_NAME) ||
    isMissingColumnError(probe.error, "normalized_name")
  ) {
    categoryLearningSupport = false;
    return false;
  }

  throw new Error(
    getErrorMessage(
      probe.error,
      "Falha ao validar suporte de correções de categoria.",
    ),
  );
}

export async function getCategoryLearningCapabilities() {
  let sharedCategoryLearning = false;
  try {
    sharedCategoryLearning = await hasCategoryLearningSupport();
  } catch {
    sharedCategoryLearning = false;
  }
  return { sharedCategoryLearning };
}

export async function fetchSharedCategoryCorrections(limit = 500) {
  const canUse = await hasCategoryLearningSupport().catch(() => false);
  if (!canUse) return {};

  const safeLimit = Math.max(1, Math.min(2000, Number(limit) || 500));
  const res = await sb
    .from(TABLE_NAME)
    .select("normalized_name,categoria")
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (
    res.error &&
    (isMissingTableError(res.error, TABLE_NAME) ||
      isMissingColumnError(res.error, "normalized_name"))
  ) {
    categoryLearningSupport = false;
    return {};
  }

  const rows = mustOk(res) || [];
  return rows.reduce((acc, row) => {
    const key = normalizeShoppingItemName(row?.normalized_name || "");
    const category = normalizeShoppingCategory(row?.categoria || "Geral");
    if (!key) return acc;
    if (!acc[key]) acc[key] = category;
    return acc;
  }, {});
}

export async function upsertSharedCategoryCorrection({
  name,
  category,
  collaboratorName = "",
}) {
  const canUse = await hasCategoryLearningSupport().catch(() => false);
  if (!canUse) return false;

  const normalizedName = normalizeShoppingItemName(name);
  const normalizedCategory = normalizeShoppingCategory(category);
  if (!normalizedName) return false;
  if (!normalizedCategory || normalizedCategory === "Geral") return false;
  if (normalizedCategory === "Churrasco") return false;

  const res = await sb.from(TABLE_NAME).upsert(
    {
      normalized_name: normalizedName,
      categoria: normalizedCategory,
      sample_name: String(name || "").trim() || normalizedName,
      updated_by_nome: collaboratorName || "Colaborador",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "normalized_name" },
  );

  if (
    res.error &&
    (isMissingTableError(res.error, TABLE_NAME) ||
      isMissingColumnError(res.error, "normalized_name"))
  ) {
    categoryLearningSupport = false;
    return false;
  }

  mustOk(res);
  return true;
}

