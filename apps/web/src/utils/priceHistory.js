const PRICE_HISTORY_KEY = "lista-de-compras-price-history";

export function getLastPriceForItem(nome, currentPeriodo) {
  try {
    const history = JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || "[]");
    const key = String(nome || "").trim().toLowerCase();
    const matches = history
      .filter(h => String(h.nome || "").trim().toLowerCase() === key && h.periodo !== currentPeriodo)
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    return matches.length ? Number(matches[0].valor_unitario) : null;
  } catch {
    return null;
  }
}

export function getPriceHistoryMap(currentPeriodo) {
  try {
    const history = JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || "[]");
    const map = {};
    for (const h of history) {
      if (h.periodo === currentPeriodo) continue;
      const key = String(h.nome || "").trim().toLowerCase();
      if (!map[key] || new Date(h.criado_em) > new Date(map[key].criado_em)) {
        map[key] = h;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export function addPriceToHistory(nome, valorUnitario, periodo, categoria) {
  try {
    const existing = JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || "[]");
    const next = [
      ...existing,
      {
        nome,
        valor_unitario: valorUnitario,
        periodo,
        categoria,
        criado_em: new Date().toISOString(),
      },
    ];
    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Não foi possível salvar o histórico de preços:", error);
  }
}
