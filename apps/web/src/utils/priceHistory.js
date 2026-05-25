const PRICE_HISTORY_KEY = "lista-de-compras-price-history";

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
