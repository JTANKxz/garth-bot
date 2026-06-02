// src/utils/customCommands.js
import fs from "fs";
import path from "path";

const customCmdPath = path.join(process.cwd(), "src/database/customCommands.json");

let customCache = {};
let loaded = false;

function loadCache() {
  if (loaded) return;
  if (!fs.existsSync(customCmdPath)) {
    fs.writeFileSync(customCmdPath, "{}", "utf-8");
  }
  const data = fs.readFileSync(customCmdPath, "utf-8");
  try {
    customCache = JSON.parse(data);
  } catch {
    customCache = {};
    fs.writeFileSync(customCmdPath, "{}");
  }
  loaded = true;
}

function saveCache() {
  fs.writeFileSync(customCmdPath, JSON.stringify(customCache, null, 2), "utf-8");
}

/**
 * Cria um novo comando customizado
 */
export function createCustomCommand(cmdData) {
  loadCache();
  
  const { name, type, responses, actions, regex, category, createdBy } = cmdData;
  
  if (!name || !type) return false;
  
  customCache[name] = {
    name,
    type, // "message", "random", "sequential", "regex", "action"
    responses: responses || [],
    actions: actions || [],
    regex: regex || null,
    category: category || "public", // public, admin, owner, creator
    createdBy,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  saveCache();
  return true;
}

/**
 * Retorna um comando customizado
 */
export function getCustomCommand(name) {
  loadCache();
  return customCache[name] || null;
}

/**
 * Deleta um comando customizado
 */
export function deleteCustomCommand(name) {
  loadCache();
  if (customCache[name]) {
    delete customCache[name];
    saveCache();
    return true;
  }
  return false;
}

/**
 * Lista todos os comandos (ou de um criador específico)
 */
export function listCustomCommands(creatorId = null) {
  loadCache();
  
  if (creatorId) {
    return Object.values(customCache).filter(cmd => cmd.createdBy === creatorId);
  }
  
  return Object.values(customCache);
}

/**
 * Executa um comando customizado
 */
export async function executeCustomCommand(sock, jid, cmdData, msg) {
  try {
    const { type, responses, regex, actions } = cmdData;

    if (type === "message" && responses.length > 0) {
      // Mensagem simples
      await sock.sendMessage(jid, { text: responses[0] }, { quoted: msg });
    }

    if (type === "random" && responses.length > 0) {
      // Resposta aleatória
      const response = responses[Math.floor(Math.random() * responses.length)];
      await sock.sendMessage(jid, { text: response }, { quoted: msg });
    }

    if (type === "sequential" && responses.length > 0) {
      // Múltiplas mensagens sequenciais
      for (let i = 0; i < responses.length; i++) {
        await sock.sendMessage(jid, { text: responses[i] }, { quoted: msg });
        if (i < responses.length - 1) {
          // Pequeno delay entre mensagens
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (type === "regex" && regex) {
      // Resposta com regex (salva)
      if (responses.length > 0) {
        const response = responses[Math.floor(Math.random() * responses.length)];
        await sock.sendMessage(jid, { text: response }, { quoted: msg });
      }
    }

    if (type === "action" && actions.length > 0) {
      // Executar ações (por enquanto só suportamos "sticker")
      const action = actions[0];
      
      if (action.type === "sticker" && msg.message?.imageMessage) {
        // Executar comando sticker (você precisa importar a lógica do sticker)
        console.log(`[Custom] Ação sticker solicitada`);
        // Aqui você chamaria a função de sticker do bot
      }
    }

    return true;
  } catch (err) {
    console.error("Erro ao executar comando customizado:", err);
    return false;
  }
}

/**
 * Verifica se um comando customizado existe
 */
export function commandExists(name) {
  loadCache();
  return customCache.hasOwnProperty(name);
}

/**
 * Atualiza um comando customizado
 */
export function updateCustomCommand(name, updates) {
  loadCache();
  
  if (!customCache[name]) return false;
  
  customCache[name] = {
    ...customCache[name],
    ...updates,
    updatedAt: Date.now()
  };
  
  saveCache();
  return true;
}
