// src/utils/creatorAiMemory.js
import fs from "fs";
import path from "path";

const memoryPath = path.join(process.cwd(), "src/database/creatorAiMemory.json");
const MAX_MESSAGES = 30; // Mantém as últimas 30 mensagens (15 interações)

let db = {
  messages: []
};
let loaded = false;

function load() {
  if (loaded) return;
  if (!fs.existsSync(memoryPath)) {
    // Garante que o diretório database exista
    const dir = path.dirname(memoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(memoryPath, JSON.stringify(db, null, 2), "utf-8");
  }
  try {
    const raw = fs.readFileSync(memoryPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.messages)) {
      db = parsed;
    }
  } catch {
    db = { messages: [] };
  }
  loaded = true;
}

function save() {
  fs.writeFileSync(memoryPath, JSON.stringify(db, null, 2), "utf-8");
}

export function getCreatorHistory() {
  load();
  return db.messages;
}

export function addCreatorMessage(role, content) {
  load();
  db.messages.push({ role, content });
  if (db.messages.length > MAX_MESSAGES) {
    db.messages = db.messages.slice(-MAX_MESSAGES);
  }
  save();
}

export function clearCreatorMemory() {
  load();
  db.messages = [];
  save();
}
