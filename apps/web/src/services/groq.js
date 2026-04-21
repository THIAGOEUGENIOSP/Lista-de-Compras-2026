const ANALYZE_URL = "/api/analyze";
const GROQ_MODEL  = "llama-3.1-8b-instant";

const SYSTEM_PROMPT =
  "Você é um consultor financeiro doméstico brasileiro especializado em otimizar listas de compras mensais. " +
  "Suas respostas são práticas, curtas, diretas e sempre em português. " +
  "Use emojis relevantes no início de cada sugestão para facilitar a leitura.";

function buildPrompt({ items, totalValue, insights }) {
  const top = items.slice(0, 35);
  const itemsStr = top
    .map((it) => {
      const qty   = Number(it.quantidade || 1);
      const unit  = Number(it.valor_unitario || 0);
      const total = qty * unit;
      return `• ${it.nome}: R$${unit.toFixed(2)} × ${qty} = R$${total.toFixed(2)} [${it.categoria || "Geral"}, ${it.status}]`;
    })
    .join("\n");

  const extras = [];
  if (insights.duplicates?.length)
    extras.push(`Duplicados detectados: ${insights.duplicates.slice(0, 4).join(", ")}`);
  if (insights.zeroPrice?.length)
    extras.push(`Sem preço definido: ${insights.zeroPrice.slice(0, 4).join(", ")}`);
  if (insights.priceyItems?.length)
    extras.push(
      `Itens mais caros vs média: ${insights.priceyItems
        .slice(0, 3)
        .map((x) => `${x.name} (R$${x.total.toFixed(2)})`)
        .join(", ")}`,
    );

  return `Lista de compras do mês:
- Total: R$${Number(totalValue || 0).toFixed(2)} | ${items.length} itens
- Supérfluos identificados: ${insights.wasteTotalLabel || "R$0,00"} (${insights.wastePctLabel || "0%"})
${extras.join("\n")}

Itens (${top.length}${items.length > 35 ? ` de ${items.length}` : ""}):
${itemsStr}

Dê 4–6 sugestões práticas e específicas para reduzir gastos nesta lista. Cada sugestão em uma linha, começando com emoji.`;
}

export async function analyzeShoppingListStreaming({
  items,
  totalValue,
  insights,
  onChunk,
  onDone,
  onError,
}) {
  let res;
  try {
    res = await fetch(ANALYZE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: buildPrompt({ items, totalValue, insights }) },
        ],
        max_tokens: 550,
        temperature: 0.65,
      }),
    });
  } catch {
    onError(new Error("Falha de conexão. Verifique sua internet."));
    return;
  }

  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message || body?.error || msg;
    } catch {}
    onError(new Error(msg));
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const json  = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullText += delta;
            onChunk(fullText);
          }
        } catch {}
      }
    }
    onDone(fullText);
  } catch {
    onError(new Error("Leitura interrompida. Tente novamente."));
  }
}
