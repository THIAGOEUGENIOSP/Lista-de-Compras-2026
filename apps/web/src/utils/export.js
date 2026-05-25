function safeFilename(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_.]/g, "");
}

function escapeCsvValue(value) {
  if (value == null) return "";
  const text = value.toString();
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportToCSV(items, filename = "lista-de-compras") {
  if (!Array.isArray(items) || items.length === 0) return;

  const headers = Object.keys(items[0]);
  const rows = items.map((item) =>
    headers.map((key) => escapeCsvValue(item[key])).join(";")
  );
  const csv = [headers.join(";"), ...rows].join("\r\n");
  downloadFile(csv, `${safeFilename(filename)}.csv`, "text/csv;charset=utf-8;");
}

export function exportToJSON(items, filename = "lista-de-compras") {
  const json = JSON.stringify(items, null, 2);
  downloadFile(json, `${safeFilename(filename)}.json`, "application/json;charset=utf-8;");
}

export function generateShareText(items, kpis = {}, periodLabel = "") {
  const header = [`Lista de Compras ${periodLabel}`, ""];
  const summary = [
    `Itens: ${items.length}`,
    `Total gasto: ${kpis.totalGasto ?? "-"}`,
    `Pendentes: ${kpis.pendingCount ?? "-"}`,
    `Comprados: ${kpis.boughtCount ?? "-"}`,
    "",
  ];

  const lines = items.map((item) => {
    const quantity = item.quantidade ?? "";
    const unit = item.valor_unitario != null ? `R$ ${item.valor_unitario}` : "";
    return `${item.nome} — ${quantity} x ${unit}`.trim();
  });

  return [...header, ...summary, ...lines].join("\n");
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return true;
  } catch {
    return false;
  }
}
