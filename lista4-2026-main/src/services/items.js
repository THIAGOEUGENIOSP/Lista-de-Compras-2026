import { sb } from "../config/supabase.js";
import {
  getErrorMessage,
  isMissingColumnError,
  isMissingTableError,
  mustOk,
} from "./db.js";

const ITEM_COLUMNS =
  "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at";

let softDeleteSupport = null;
let auditLogSupport = null;

async function hasSoftDeleteSupport() {
  if (softDeleteSupport !== null) return softDeleteSupport;
  const probe = await sb.from("items").select("deleted_at").limit(1);
  if (!probe.error) {
    softDeleteSupport = true;
    return softDeleteSupport;
  }
  if (isMissingColumnError(probe.error, "deleted_at")) {
    softDeleteSupport = false;
    return softDeleteSupport;
  }
  throw new Error(getErrorMessage(probe.error, "Falha ao validar soft delete."));
}

async function hasAuditLogSupport() {
  if (auditLogSupport !== null) return auditLogSupport;
  const probe = await sb.from("audit_log").select("id").limit(1);
  if (!probe.error) {
    auditLogSupport = true;
    return auditLogSupport;
  }
  if (isMissingTableError(probe.error, "audit_log")) {
    auditLogSupport = false;
    return auditLogSupport;
  }
  throw new Error(getErrorMessage(probe.error, "Falha ao validar audit_log."));
}

async function safeLogAudit({
  action,
  collaboratorName,
  periodId,
  itemId = null,
  details = {},
}) {
  try {
    if (!(await hasAuditLogSupport())) return false;

    const res = await sb.from("audit_log").insert({
      action,
      collaborator_name: collaboratorName || "Colaborador",
      period_id: periodId || null,
      item_id: itemId || null,
      details: details || {},
      user_agent: navigator?.userAgent || "unknown",
    });

    if (res.error && isMissingTableError(res.error, "audit_log")) {
      auditLogSupport = false;
      return false;
    }
    mustOk(res);
    return true;
  } catch {
    return false;
  }
}

function withSoftDeleteFilter(query, enabled) {
  return enabled ? query.is("deleted_at", null) : query;
}

export async function fetchItems(periodoId) {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }

  let query = sb.from("items").select(ITEM_COLUMNS).eq("periodo_id", periodoId);
  query = withSoftDeleteFilter(query, canSoftDelete);
  let res = await query.order("created_at", { ascending: false });

  if (res.error && canSoftDelete && isMissingColumnError(res.error, "deleted_at")) {
    softDeleteSupport = false;
    res = await sb
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("periodo_id", periodoId)
      .order("created_at", { ascending: false });
  }

  return mustOk(res) || [];
}

export async function addItem(payload) {
  const res = await sb.from("items").insert(payload).select(ITEM_COLUMNS).single();
  return mustOk(res);
}

export async function updateItem(id, patch) {
  const res = await sb.from("items").update(patch).eq("id", id).select(ITEM_COLUMNS).single();
  return mustOk(res);
}

export async function deleteItem(id, collaboratorName = "", reason = "Remoção individual") {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }

  if (canSoftDelete) {
    const now = new Date().toISOString();
    const softRes = await sb
      .from("items")
      .update({
        deleted_at: now,
        deleted_by_nome: collaboratorName || "Colaborador",
        delete_reason: reason,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id,periodo_id")
      .maybeSingle();

    if (!softRes.error) {
      const row = softRes.data || {};
      await safeLogAudit({
        action: "ITEM_SOFT_DELETE",
        collaboratorName,
        periodId: row.periodo_id || null,
        itemId: row.id || id,
        details: { reason },
      });
      return true;
    }

    if (!isMissingColumnError(softRes.error, "deleted_at")) {
      throw new Error(
        getErrorMessage(softRes.error, "Falha ao mover item para lixeira."),
      );
    }

    softDeleteSupport = false;
  }

  const hardRes = await sb.from("items").delete().eq("id", id);
  mustOk(hardRes);
  await safeLogAudit({
    action: "ITEM_HARD_DELETE",
    collaboratorName,
    periodId: null,
    itemId: id,
    details: { reason, fallback: true },
  });
  return true;
}

export async function bulkZeroPrices(periodoId, collaboratorName = "") {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }

  let query = sb.from("items").update({ valor_unitario: 0 }).eq("periodo_id", periodoId);
  query = withSoftDeleteFilter(query, canSoftDelete);

  let res = await query;
  if (res.error && canSoftDelete && isMissingColumnError(res.error, "deleted_at")) {
    softDeleteSupport = false;
    res = await sb
      .from("items")
      .update({ valor_unitario: 0 })
      .eq("periodo_id", periodoId);
  }

  mustOk(res);
  await safeLogAudit({
    action: "BULK_ZERO_PRICES",
    collaboratorName,
    periodId: periodoId,
    details: {},
  });
  return true;
}

export async function bulkDeleteByPeriod(
  periodoId,
  collaboratorName = "",
  reason = "Exclusão mensal",
) {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }

  if (canSoftDelete) {
    const now = new Date().toISOString();
    const softRes = await sb
      .from("items")
      .update({
        deleted_at: now,
        deleted_by_nome: collaboratorName || "Colaborador",
        delete_reason: reason,
      })
      .eq("periodo_id", periodoId)
      .is("deleted_at", null);

    if (!softRes.error) {
      await safeLogAudit({
        action: "MONTH_SOFT_DELETE",
        collaboratorName,
        periodId: periodoId,
        details: { reason },
      });
      return true;
    }

    if (!isMissingColumnError(softRes.error, "deleted_at")) {
      throw new Error(
        getErrorMessage(softRes.error, "Falha ao mover mês para lixeira."),
      );
    }

    softDeleteSupport = false;
  }

  const hardRes = await sb.from("items").delete().eq("periodo_id", periodoId);
  mustOk(hardRes);
  await safeLogAudit({
    action: "MONTH_HARD_DELETE",
    collaboratorName,
    periodId: periodoId,
    details: { reason, fallback: true },
  });
  return true;
}

export async function restoreDeletedByPeriod(periodoId, collaboratorName = "") {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }
  if (!canSoftDelete) return 0;

  const restoreRes = await sb
    .from("items")
    .update({
      deleted_at: null,
      deleted_by_nome: null,
      delete_reason: null,
    })
    .eq("periodo_id", periodoId)
    .not("deleted_at", "is", null)
    .select("id");

  if (restoreRes.error && isMissingColumnError(restoreRes.error, "deleted_at")) {
    softDeleteSupport = false;
    return 0;
  }

  const restored = mustOk(restoreRes) || [];
  await safeLogAudit({
    action: "MONTH_RESTORE",
    collaboratorName,
    periodId: periodoId,
    details: { restored_count: restored.length },
  });
  return restored.length;
}

export async function countDeletedByPeriod(periodoId) {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }
  if (!canSoftDelete) return 0;

  const res = await sb
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("periodo_id", periodoId)
    .not("deleted_at", "is", null);

  if (res.error && isMissingColumnError(res.error, "deleted_at")) {
    softDeleteSupport = false;
    return 0;
  }
  mustOk(res);
  return Number(res.count || 0);
}

export async function purgeDeletedByPeriod(
  periodoId,
  collaboratorName = "",
  reason = "Limpeza definitiva da lixeira mensal",
) {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }
  if (!canSoftDelete) return 0;

  const delRes = await sb
    .from("items")
    .delete()
    .eq("periodo_id", periodoId)
    .not("deleted_at", "is", null)
    .select("id");

  if (delRes.error && isMissingColumnError(delRes.error, "deleted_at")) {
    softDeleteSupport = false;
    return 0;
  }

  const deletedRows = mustOk(delRes) || [];
  await safeLogAudit({
    action: "MONTH_PURGE_DELETED",
    collaboratorName,
    periodId: periodoId,
    details: { deleted_count: deletedRows.length, reason },
  });
  return deletedRows.length;
}

export async function copyItemsToPeriod({
  fromPeriodId,
  toPeriodId,
  createdByName,
}) {
  let canSoftDelete = false;
  try {
    canSoftDelete = await hasSoftDeleteSupport();
  } catch {
    canSoftDelete = false;
  }

  let query = sb
    .from("items")
    .select("nome,quantidade,valor_unitario,unidade,categoria")
    .eq("periodo_id", fromPeriodId);
  query = withSoftDeleteFilter(query, canSoftDelete);

  let src = await query;
  if (src.error && canSoftDelete && isMissingColumnError(src.error, "deleted_at")) {
    softDeleteSupport = false;
    src = await sb
      .from("items")
      .select("nome,quantidade,valor_unitario,unidade,categoria")
      .eq("periodo_id", fromPeriodId);
  }

  const rows = mustOk(src) || [];
  if (rows.length === 0) return 0;

  const payload = rows.map((r) => ({
    ...r,
    status: "PENDENTE",
    periodo_id: toPeriodId,
    criado_por_nome: createdByName || "Colaborador",
  }));

  const ins = await sb.from("items").insert(payload);
  mustOk(ins);
  return payload.length;
}

export function __resetItemsServiceCapabilitiesForTests() {
  softDeleteSupport = null;
  auditLogSupport = null;
}

export async function getItemsCapabilities() {
  let softDelete = false;
  let auditLog = false;

  try {
    softDelete = await hasSoftDeleteSupport();
  } catch {
    softDelete = false;
  }

  try {
    auditLog = await hasAuditLogSupport();
  } catch {
    auditLog = false;
  }

  return { softDelete, auditLog };
}
