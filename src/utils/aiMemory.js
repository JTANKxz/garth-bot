// src/utils/aiMemory.js
import fs from "fs";
import path from "path";

const memoryPath = path.join(process.cwd(), "src/database/aiMemory.json");

// 12 horas
const TTL_MS = 12 * 60 * 60 * 1000;

// limites
const MAX_USER_INTERACTIONS = 3;   // por user (individual)
const MAX_GROUP_INTERACTIONS = 10; // por grupo (shared)

let loaded = false;

// formato do arquivo:
// {
//   "lastResetAt": 123,
//   "groups": {
//     "xxx@g.us": {
//       "users": {
//         "user@s.whatsapp.net": { "name": "Fulano", "interactions": [ ... ] }
//       },
//       "shared": { "interactions": [ ... ] }
//     }
//   }
// }
let db = {
  lastResetAt: 0,
  groups: {},
};

function now() {
  return Date.now();
}

function load() {
  if (loaded) return;

  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, JSON.stringify(db, null, 2), "utf-8");
  }

  try {
    const raw = fs.readFileSync(memoryPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object") {
      db = {
        lastResetAt: Number(parsed.lastResetAt || 0),
        groups: parsed.groups && typeof parsed.groups === "object" ? parsed.groups : {},
      };
    }
  } catch {
    db = { lastResetAt: 0, groups: {} };
    fs.writeFileSync(memoryPath, JSON.stringify(db, null, 2), "utf-8");
  }

  loaded = true;
  maybeResetAll();
}

function save() {
  fs.writeFileSync(memoryPath, JSON.stringify(db, null, 2), "utf-8");
}

function maybeResetAll() {
  const t = now();
  const last = Number(db.lastResetAt || 0);

  // primeira execução
  if (!last) {
    db.lastResetAt = t;
    save();
    return;
  }

  // passou 12h => limpa TUDO
  if (t - last >= TTL_MS) {
    db = { lastResetAt: t, groups: {} };
    save();
  }
}

function ensureGroup(groupJid) {
  if (!db.groups[groupJid]) {
    db.groups[groupJid] = {
      users: {},
      shared: { interactions: [] },
    };
  }

  const g = db.groups[groupJid];

  if (!g.users || typeof g.users !== "object") g.users = {};
  if (!g.shared || typeof g.shared !== "object") g.shared = { interactions: [] };
  if (!Array.isArray(g.shared.interactions)) g.shared.interactions = [];

  return g;
}

function ensureUser(groupJid, userJid) {
  const g = ensureGroup(groupJid);

  if (!g.users[userJid]) {
    g.users[userJid] = { name: null, interactions: [] };
  }

  const u = g.users[userJid];
  if (!Array.isArray(u.interactions)) u.interactions = [];
  return u;
}

function clip(s, max = 1200) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/**
 * Atualiza/guarda o nome do user (pushName)
 */
export function rememberUserName(groupJid, userJid, name) {
  load();
  maybeResetAll();

  const u = ensureUser(groupJid, userJid);
  const clean = String(name || "").trim();
  if (clean) u.name = clean;

  save();
}

/**
 * Salva uma interação completa:
 * - individual do user (últimas 3)
 * - shared do grupo (últimas 10)
 *
 * interaction = { userPrompt, botReply }
 */
export function addInteraction({ groupJid, userJid, userName, userPrompt, botReply }) {
  load();
  maybeResetAll();

  const g = ensureGroup(groupJid);
  const u = ensureUser(groupJid, userJid);

  // nome
  const cleanName = String(userName || "").trim();
  if (cleanName) u.name = cleanName;

  const interaction = {
    ts: now(),
    userJid,
    userName: cleanName || u.name || null,
    userPrompt: clip(userPrompt, 1200),
    botReply: clip(botReply, 2000),
  };

  // individual (últimas 3)
  u.interactions.push(interaction);
  if (u.interactions.length > MAX_USER_INTERACTIONS) {
    u.interactions = u.interactions.slice(-MAX_USER_INTERACTIONS);
  }

  // shared do grupo (últimas 10)
  g.shared.interactions.push(interaction);
  if (g.shared.interactions.length > MAX_GROUP_INTERACTIONS) {
    g.shared.interactions = g.shared.interactions.slice(-MAX_GROUP_INTERACTIONS);
  }

  save();
}

/**
 * Monta history (messages) pro Ollama:
 * - inclui shared do grupo (10) + individual desse user (3)
 * - inclui nome do user no texto, pra IA "saber"
 */
export function buildOllamaHistory({ groupJid, userJid }) {
  load();
  maybeResetAll();

  const g = db.groups[groupJid];
  if (!g) return [];

  const shared = Array.isArray(g.shared?.interactions) ? g.shared.interactions : [];
  const u = g.users?.[userJid];
  const personal = Array.isArray(u?.interactions) ? u.interactions : [];

  const messages = [];

  // Shared do grupo (mais antigo -> mais novo)
  for (const it of shared) {
    const name = it.userName || "Usuário";
    messages.push({ role: "user", content: `${name} disse: ${it.userPrompt}` });
    messages.push({ role: "assistant", content: it.botReply });
  }

  // Memória individual (mais antigo -> mais novo)
  for (const it of personal) {
    const name = it.userName || "Você";
    messages.push({ role: "user", content: `(Contexto com ${name}) ${it.userPrompt}` });
    messages.push({ role: "assistant", content: it.botReply });
  }

  return messages;
}

/**
 * (Opcional) Limpa tudo na mão
 */
export function clearAllMemory() {
  load();
  db = { lastResetAt: now(), groups: {} };
  save();
}