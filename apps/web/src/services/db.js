export function getErrorMessage(err, fallback = "Erro inesperado.") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message.trim()) return err.message;
  if (
    typeof err.error_description === "string" &&
    err.error_description.trim()
  ) {
    return err.error_description;
  }
  if (typeof err.details === "string" && err.details.trim()) return err.details;

  const code = typeof err.code === "string" ? err.code : "";
  const hint = typeof err.hint === "string" ? err.hint : "";
  const joined = [code, hint].filter(Boolean).join(" - ");
  return joined || fallback;
}

export function isMissingColumnError(err, columnName = "") {
  if (!err) return false;
  const code = String(err.code || "").toUpperCase();
  const msg = getErrorMessage(err, "").toLowerCase();
  const col = String(columnName || "").toLowerCase();
  const hasColumn = col ? msg.includes(col) : true;
  return (code === "42703" || msg.includes("column")) && hasColumn;
}

export function isMissingTableError(err, tableName = "") {
  if (!err) return false;
  const code = String(err.code || "").toUpperCase();
  const msg = getErrorMessage(err, "").toLowerCase();
  const tbl = String(tableName || "").toLowerCase();
  const hasTable = tbl ? msg.includes(tbl) : true;
  return (code === "42P01" || msg.includes("relation")) && hasTable;
}

export function mustOk(res) {
  if (res.error) {
    const wrapped = new Error(
      getErrorMessage(res.error, "Falha na operação de banco de dados."),
    );
    wrapped.cause = res.error;
    throw wrapped;
  }
  return res.data;
}
