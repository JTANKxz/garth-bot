/**
 * src/utils/economyManager.js
 * Gerenciador central de configurações econômicas.
 */

import { readJSON } from "./readJSON.js";

const GLOBAL_SETTINGS_DB = "database/globalSettings.json";
const GROUPS_DB = "database/groups.json";

/**
 * Busca uma configuração, respeitando a hierarquia:
 * 1. Override do Grupo (em groups.json)
 * 2. Config Global (em globalSettings.json)
 * 3. Valor padrão seguro (Hardcoded)
 */
export function getSetting(groupId, key) {
  try {
    // 1. Tenta buscar no Grupo
    const groupsData = readJSON(GROUPS_DB) || {};
    const groupConfig = groupsData[groupId];
    
    if (groupConfig && groupConfig.economy && groupConfig.economy[key] !== undefined) {
      return groupConfig.economy[key];
    }

    // 2. Tenta buscar Global
    const globalSettings = readJSON(GLOBAL_SETTINGS_DB) || {};
    if (globalSettings[key] !== undefined) {
      return globalSettings[key];
    }

    // 3. Defaults Hardcoded (Safety Fallback)
    const fallbacks = {
      win_rate_base: 35,
      win_rate_vip: 50,
      daily_base: 150,
      rob_chance_base: 25,
      lottery_ticket_price: 500
    };

    return fallbacks[key] || 0;
  } catch (err) {
    console.error(`Erro ao buscar setting ${key}:`, err);
    return 0;
  }
}

/**
 * Busca a lista de itens da loja.
 */
export function getShopItems() {
    return readJSON("database/shop.json") || [];
}
