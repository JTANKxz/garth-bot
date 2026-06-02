// src/utils/antispam.js
import { getGroupConfig, updateGroupConfig } from "./groups.js";

const spamTracker = {};

// Config padrão de antispam por grupo
const defaultSpamConfig = {
  enabled: false,
  maxMessages: 6, // máximo de mensagens
  timeWindow: 900, // em ms (900ms = 0.9s)
  blockDuration: 30000, // tempo bloqueado em ms (30s)
  warnOnSpam: true // aplica advertência ao cair em spam
};

/**
 * Inicializa ou retorna config de antispam do grupo
 */
export function getGroupSpamConfig(groupId) {
  const config = getGroupConfig(groupId);
  
  if (!config.antispam) {
    config.antispam = { ...defaultSpamConfig };
    updateGroupConfig(groupId, { antispam: config.antispam });
  }
  
  return config.antispam;
}

/**
 * Atualiza config de antispam do grupo
 */
export function setGroupSpamConfig(groupId, newConfig) {
  const config = getGroupConfig(groupId);
  config.antispam = { ...defaultSpamConfig, ...newConfig };
  updateGroupConfig(groupId, { antispam: config.antispam });
  return config.antispam;
}

/**
 * Verifica se mensagem é spam
 * Retorna: { isSpam: boolean, warned: boolean }
 */
export function checkSpam(groupId, sender) {
  const spamConfig = getGroupSpamConfig(groupId);
  
  // se desativado, sempre false
  if (!spamConfig.enabled) {
    return { isSpam: false, warned: false };
  }

  const now = Date.now();
  const key = `${groupId}:${sender}`;

  if (!spamTracker[key]) {
    spamTracker[key] = {
      msgs: 0,
      last: now,
      blocked: false,
      warningApplied: false
    };
    return { isSpam: false, warned: false };
  }

  const user = spamTracker[key];

  // se está bloqueado
  if (user.blocked) {
    if (now - user.last > spamConfig.blockDuration) {
      user.blocked = false;
      user.msgs = 0;
      user.warningApplied = false;
      return { isSpam: false, warned: false };
    }
    return { isSpam: true, warned: user.warningApplied };
  }

  // se está dentro da janela de tempo
  if (now - user.last < spamConfig.timeWindow) {
    user.msgs++;

    if (user.msgs >= spamConfig.maxMessages) {
      user.blocked = true;
      user.last = now;
      const warned = spamConfig.warnOnSpam && !user.warningApplied;
      if (warned) user.warningApplied = true;
      return { isSpam: true, warned };
    }
  } else {
    // saiu da janela, reseta contador
    user.msgs = 1;
  }

  user.last = now;
  return { isSpam: false, warned: false };
}

/**
 * Limpa tracker do antispam de um usuário
 */
export function clearUserSpamTracker(groupId, sender) {
  const key = `${groupId}:${sender}`;
  if (spamTracker[key]) {
    delete spamTracker[key];
  }
}

/**
 * Reseta antispam de todo o grupo
 */
export function resetGroupSpamTracker(groupId) {
  const keys = Object.keys(spamTracker).filter(k => k.startsWith(`${groupId}:`));
  keys.forEach(k => delete spamTracker[k]);
}
