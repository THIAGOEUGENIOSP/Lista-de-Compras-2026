export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY não configurada no Vercel." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    messages,
    model = "llama-3.1-8b-instant",
    max_tokens = 550,
    temperature = 0.65,
  } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Campo 'messages' obrigatório." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature, stream: true }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    return new Response(errText, {
      status: groqRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Passa o stream do Groq diretamente para o cliente
  return new Response(groqRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
