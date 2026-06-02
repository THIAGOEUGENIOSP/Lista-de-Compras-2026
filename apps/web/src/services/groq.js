const ANALYZE_URL    = "/api/analyze";
const GROQ_DIRECT    = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL     = "llama-3.1-8b-instant";
const LOCAL_KEY_NAME = "groq_local_key";

const SYSTEM_PROMPT =
  "Você é um consultor financeiro doméstico brasileiro especializado em otimizar listas de compras mensais. " +
  "Suas respostas são práticas, curtas, diretas e sempre em português. " +
  "Use emojis relevantes no início de cada sugestão para facilitar a leitura.";

export function getLocalKey()       { return localStorage.getItem(LOCAL_KEY_NAME) || ""; }
export function saveLocalKey(key)   { key ? localStorage.setItem(LOCAL_KEY_NAME, key) : localStorage.removeItem(LOCAL_KEY_NAME); }

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
    extras.push(`Itens mais caros vs média: ${insights.priceyItems.slice(0, 3).join(", ")}`);

  return `Lista de compras do mês:
- Total: R$${Number(totalValue || 0).toFixed(2)} | ${items.length} itens
- Supérfluos identificados: ${insights.wasteTotalLabel || "R$0,00"} (${insights.wastePctLabel || "0%"})
${extras.join("\n")}

Itens (${top.length}${items.length > 35 ? ` de ${items.length}` : ""}):
${itemsStr}

Dê 4–6 sugestões práticas e específicas para reduzir gastos nesta lista. Cada sugestão em uma linha, começando com emoji.`;
}

function buildMessages({ items, totalValue, insights }) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: buildPrompt({ items, totalValue, insights }) },
  ];
}

async function streamSSE(res, onChunk, onDone, onError) {
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

export async function analyzeShoppingListStreaming({
  items,
  totalValue,
  insights,
  onChunk,
  onDone,
  onError,
}) {
  const messages = buildMessages({ items, totalValue, insights });
  const payload  = { model: GROQ_MODEL, messages, max_tokens: 550, temperature: 0.65 };

  /* --- Tenta proxy Vercel primeiro --- */
  let proxyFailed = false;
  try {
    const res = await fetch(ANALYZE_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (res.ok) {
      return streamSSE(res, onChunk, onDone, onError);
    }

    /* Proxy respondeu com erro HTTP */
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message || body?.error || msg;
    } catch {}

    /* Erro 500 com "não configurada" → proxy existe mas falta a chave no Vercel */
    if (msg.includes("não configurada")) {
      proxyFailed = true; // vai tentar com chave local
    } else {
      onError(new Error(msg));
      return;
    }
  } catch {
    /* Proxy não existe (ambiente local) → tenta com chave local */
    proxyFailed = true;
  }

  if (!proxyFailed) return;

  /* --- Fallback: chamada direta com chave local --- */
  const localKey = getLocalKey();
  if (!localKey) {
    onError(new Error("NO_LOCAL_KEY"));
    return;
  }

  let res;
  try {
    res = await fetch(GROQ_DIRECT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${localKey}`,
      },
      body: JSON.stringify({ ...payload, stream: true }),
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

  return streamSSE(res, onChunk, onDone, onError);
}
