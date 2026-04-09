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

  // ✅ VIP do grupo
  vip: {
    enabled: false,
    expiresAt: null, // number (ms) | null
  },
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

// ✅ normaliza VIP (caso arquivo antigo não tenha vip, ou esteja quebrado)
function normalizeVip(config) {
  const vipDefault = defaultConfig.vip;

  if (!config.vip || typeof config.vip !== "object") {
    config.vip = { ...vipDefault };
    return;
  }

  if (typeof config.vip.enabled !== "boolean") config.vip.enabled = vipDefault.enabled;

  const exp = config.vip.expiresAt;
  const expOk = exp === null || (typeof exp === "number" && Number.isFinite(exp) && exp > 0);
  if (!expOk) config.vip.expiresAt = vipDefault.expiresAt;
}

// ✅ se expirou, desativa e limpa expiresAt
function autoExpireVipIfNeeded(config) {
  if (!config?.vip?.enabled) return;

  const exp = config.vip.expiresAt;
  if (typeof exp === "number" && Date.now() >= exp) {
    config.vip.enabled = false;
    config.vip.expiresAt = null;
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

    // VIP é objeto, então normaliza
    normalizeVip(groupCache[groupId]);

    // auto-expira se necessário
    autoExpireVipIfNeeded(groupCache[groupId]);

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

  // se newData.vip veio parcial, garante estrutura
  normalizeVip(groupCache[groupId]);
  autoExpireVipIfNeeded(groupCache[groupId]);

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

    normalizeVip(groupCache[groupId]);
    autoExpireVipIfNeeded(groupCache[groupId]);

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

/* =========================
   ✅ VIP helpers
   ========================= */

// Ativa VIP por X dias/horas/minutos (ou até uma data)
export function setGroupVip(groupId, { enabled = true, expiresAt = null } = {}) {
  const config = getGroupConfig(groupId);

  const vip = {
    enabled: Boolean(enabled),
    expiresAt: expiresAt === null ? null : Number(expiresAt),
  };

  // se vier inválido, zera
  if (vip.expiresAt !== null && (!Number.isFinite(vip.expiresAt) || vip.expiresAt <= 0)) {
    vip.expiresAt = null;
  }

  updateGroupConfig(groupId, { vip });
}

// Conveniência: VIP por duração (ms)
export function setGroupVipForMs(groupId, ms) {
  const duration = Number(ms);
  const expiresAt =
    Number.isFinite(duration) && duration > 0 ? Date.now() + duration : null;

  setGroupVip(groupId, { enabled: true, expiresAt });
}

// Desativa VIP e limpa expiração
export function disableGroupVip(groupId) {
  setGroupVip(groupId, { enabled: false, expiresAt: null });
}

// Retorna true somente se enabled e não expirado
export function isGroupVip(groupId) {
  const config = getGroupConfig(groupId);
  // getGroupConfig já auto-expira, então basta ler:
  return Boolean(config.vip?.enabled);
}

// Se quiser saber quanto falta (ms). Retorna null se não tiver expiração/sem VIP
export function getVipRemainingMs(groupId) {
  const config = getGroupConfig(groupId);
  if (!config.vip?.enabled) return null;
  if (typeof config.vip.expiresAt !== "number") return null;
  return Math.max(0, config.vip.expiresAt - Date.now());
}

export function setGroupAi(groupId, enabled) {
  updateGroupConfig(groupId, { ai: Boolean(enabled) });
}

export function isGroupAiEnabled(groupId) {
  const config = getGroupConfig(groupId);
  return Boolean(config.ai);
}