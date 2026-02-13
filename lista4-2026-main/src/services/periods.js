import { sb } from "../config/supabase.js";
import { getErrorMessage, mustOk } from "./db.js";
import {
  periodName,
  startOfMonth,
  endOfMonth,
  toISODate,
} from "../utils/period.js";

export async function ensurePeriod(date) {
  const nome = periodName(date);
  const di = toISODate(startOfMonth(date));
  const df = toISODate(endOfMonth(date));

  // tenta buscar
  const found = await sb
    .from("periodos")
    .select("*")
    .eq("nome", nome)
    .maybeSingle();
  const dataFound = mustOk(found);
  if (dataFound) return dataFound;

  // cria
  try {
    const created = await sb
      .from("periodos")
      .insert({ nome, data_inicio: di, data_fim: df })
      .select("*")
      .single();
    return mustOk(created);
  } catch (err) {
    const raw = err?.cause || err || {};
    const code = String(raw.code || "").toUpperCase();
    const msg = getErrorMessage(raw, "").toLowerCase();
    const isRls =
      code === "42501" ||
      msg.includes("row-level security") ||
      msg.includes("violates row-level security policy");

    if (!isRls) throw err;

    // fallback seguro: tenta reutilizar o período mais recente já existente
    const latest = await sb
      .from("periodos")
      .select("*")
      .order("data_inicio", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestData = mustOk(latest);
    if (latestData) return latestData;

    throw new Error(
      "Sem permissão para criar períodos (RLS). Aplique as policies de INSERT/SELECT na tabela periodos.",
    );
  }
}

export async function listRecentPeriods(limit = 12) {
  const res = await sb
    .from("periodos")
    .select("*")
    .order("data_inicio", { ascending: false })
    .limit(limit);
  return mustOk(res);
}
