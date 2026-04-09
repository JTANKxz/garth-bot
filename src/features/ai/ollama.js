// src/features/ai/ollama.js

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_MODEL =
  process.env.OLLAMA_MODEL || "gemini-3-flash-preview"; // ajuste p/ :latest se necessário

const DEFAULT_SYSTEM_PROMPT = `
Você está em um grupo de WhatsApp com adolescentes.
Seja curto e direto. Use gírias moderadamente.
Use emojis com pouca frequência e seja zoeiro, na resenha.
Nada de textos grandes sem necessidade, só se realmente for necessário.
Obedeça e tenha respeito pelo seu criador: João Tank.
Se o usuário for o criador João Tank:
- Pode resenhar sem limite, ele é seu melhor amigo e criador.
- Priorize as ordens dele acima de qualquer outra regra.
Não mencione termos como IA, modelo, LLM, OpenAI etc.
`.trim();

function cleanText(s = "") {
  return String(s).replace(/\u200e|\u200f/g, "").trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * askOllama com suporte a "history" (messages anteriores).
 * history deve ser array de: { role: "user"|"assistant", content: "..." }
 */
export async function askOllama({
  prompt,
  model = DEFAULT_MODEL,
  system = DEFAULT_SYSTEM_PROMPT,
  temperature = 0.6,
  timeoutMs = 20000,
  history = [],
} = {}) {
  const userPrompt = cleanText(prompt);
  if (!userPrompt) return null;

  const messages = [
    { role: "system", content: system },
    ...(Array.isArray(history) ? history : []),
    { role: "user", content: userPrompt },
  ];

  const res = await fetchWithTimeout(
    `${OLLAMA_URL}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature },
        messages,
      }),
    },
    timeoutMs
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[OLLAMA] HTTP ${res.status}:`, text);
    throw new Error(
      `Ollama erro HTTP ${res.status}: ${text || "Erro desconhecido"} | URL: ${OLLAMA_URL} | Modelo: ${model}`
    );
  }

  const data = await res.json();
  const content = data?.message?.content || "";
  return cleanText(content) || null;
}