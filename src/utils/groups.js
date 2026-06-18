// src/utils/groups.js
import fs from "fs";
import path from "path";

const groupsFilePath = path.join(process.cwd(), "src/database/groups.json");

let groupCache = {};
let loaded = false;

// Config padrão
const defaultConfig = {
  groupName: null,
  prefix: "!",
  welcomeMessage: "Seja bem-vindo(a)!",
  onlyAdmins: false,
  leaveGroupMessage: false,
  welcomeGroup: false,
  antilink: false,
  antifig: false,
  auto: false,
  autoLearn: false,
  ai: false,
  blacklisteds: [],
  warnings: {},
  muteds: {},
  botOwners: [],
  allowedUsers: [],
  blockedUsers: [],

  authExpiresAt: null,

  // ✅ Antispam do grupo
  antispam: {
    enabled: false,
    maxMessages: 6,
    timeWindow: 900,
    blockDuration: 30000,
    warnOnSpam: true
  },

  // ✅ Permite criador executar comandos sem prefixo
  noprefix: false
};

// Carrega o cache
function loadCache() {
  if (loaded) return;
  if (!fs.existsSync(groupsFilePath)) fs.writeFileSync(groupsFilePath, "{}", "utf-8");
  const data = fs.readFileSync(groupsFilePath, "utf-8");
  try {
    groupCache = JSON.parse(data);
  } catch {
    groupCache = {};
    fs.writeFileSync(groupsFilePath, "{}");
  }
  loaded = true;
}

// Salva cache
function saveCache() {
  fs.writeFileSync(groupsFilePath, JSON.stringify(groupCache, null, 2), "utf-8");
}


// ✅ normaliza Antispam
function normalizeAntispam(config) {
  const spamDefault = defaultConfig.antispam;

  if (!config.antispam || typeof config.antispam !== "object") {
    config.antispam = { ...spamDefault };
    return;
  }

  if (typeof config.antispam.enabled !== "boolean") config.antispam.enabled = spamDefault.enabled;
  if (typeof config.antispam.maxMessages !== "number" || config.antispam.maxMessages < 1) {
    config.antispam.maxMessages = spamDefault.maxMessages;
  }
  if (typeof config.antispam.timeWindow !== "number" || config.antispam.timeWindow < 100) {
    config.antispam.timeWindow = spamDefault.timeWindow;
  }
  if (typeof config.antispam.blockDuration !== "number" || config.antispam.blockDuration < 100) {
    config.antispam.blockDuration = spamDefault.blockDuration;
  }
  if (typeof config.antispam.warnOnSpam !== "boolean") {
    config.antispam.warnOnSpam = spamDefault.warnOnSpam;
  }
}


// Pega a config (cria se não existir)
export function getGroupConfig(groupId) {
  loadCache();

  if (!groupCache[groupId]) {
    groupCache[groupId] = { ...defaultConfig, groupName: groupId };
    saveCache();
  } else {
    // garante chaves antigas
    for (const key of Object.keys(defaultConfig)) {
      if (groupCache[groupId][key] === undefined) {
        groupCache[groupId][key] = defaultConfig[key];
      }
    }

    // Antispam também é objeto, normaliza
    normalizeAntispam(groupCache[groupId]);

    saveCache();
  }

  return groupCache[groupId];
}

// Atualiza config
export function updateGroupConfig(groupId, newData) {
  loadCache();

  if (!groupCache[groupId]) groupCache[groupId] = { ...defaultConfig, groupName: groupId };

  // merge normal
  groupCache[groupId] = { ...groupCache[groupId], ...newData };

  // se newData.antispam veio parcial, garante estrutura
  normalizeAntispam(groupCache[groupId]);

  saveCache();
}

// Atualiza nome do grupo
export async function updateGroupName(groupId, sock) {
  if (!groupId.endsWith("@g.us") || !sock) return null;
  try {
    const meta = await sock.groupMetadata(groupId);
    if (!meta?.subject) return null;

    loadCache();
    if (!groupCache[groupId]) groupCache[groupId] = { ...defaultConfig, groupName: groupId };

    groupCache[groupId].groupName = meta.subject;

    normalizeAntispam(groupCache[groupId]);

    saveCache();
    return meta.subject;
  } catch (err) {
    console.error("Erro ao atualizar nome do grupo:", err);
    return null;
  }
}

export function addBotOwner(groupId, userId) {
  const config = getGroupConfig(groupId);
  if (!config.botOwners.includes(userId)) {
    config.botOwners.push(userId);
    updateGroupConfig(groupId, { botOwners: config.botOwners });
  }
}

export function removeBotOwner(groupId, userId) {
  const config = getGroupConfig(groupId);
  config.botOwners = config.botOwners.filter(id => id !== userId);
  updateGroupConfig(groupId, { botOwners: config.botOwners });
}

export function isBotOwner(groupId, userId) {
  const config = getGroupConfig(groupId);
  return config.botOwners.includes(userId);
}

// Funções para USUÁRIOS PERMITIDOS
export function addAllowedUser(groupId, userId) {
  const config = getGroupConfig(groupId);
  if (!config.allowedUsers.includes(userId)) {
    config.allowedUsers.push(userId);
    updateGroupConfig(groupId, { allowedUsers: config.allowedUsers });
  }
}

export function removeAllowedUser(groupId, userId) {
  const config = getGroupConfig(groupId);
  config.allowedUsers = config.allowedUsers.filter(id => id !== userId);
  updateGroupConfig(groupId, { allowedUsers: config.allowedUsers });
}

export function isAllowedUser(groupId, userId) {
  const config = getGroupConfig(groupId);
  return config.allowedUsers.includes(userId);
}


export function setGroupAi(groupId, enabled) {
  updateGroupConfig(groupId, { ai: Boolean(enabled) });
}

export function isGroupAiEnabled(groupId) {
  const config = getGroupConfig(groupId);
  return Boolean(config.ai);
}

// Reseta customizações de economia de todos os grupos
export function resetAllGroupsEconomy() {
  loadCache();
  let count = 0;
  for (const groupId of Object.keys(groupCache)) {
    let changed = false;
    if (groupCache[groupId].economy !== undefined) {
      delete groupCache[groupId].economy;
      changed = true;
    }
    if (groupCache[groupId].shopOverrides !== undefined) {
      delete groupCache[groupId].shopOverrides;
      changed = true;
    }
    if (changed) count++;
  }
  
  if (count > 0) saveCache();
  return count;
}