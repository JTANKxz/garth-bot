/**
 * src/features/progress/levelSystem.js
 * Lógica central de XP e Níveis Globais.
 */

import { readJSON, writeJSON } from "../../utils/readJSON.js";

const DB_PATH = "database/messageCounts.json";

/**
 * Calcula o nível com base no XP total.
 * Fórmula: Nível = floor(sqrt(XP / 100)) + 1
 */
export function calculateLevel(xp) {
  if (!xp || xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calcula quanto XP é necessário para o próximo nível.
 */
export function xpForNextLevel(currentLevel) {
  return Math.pow(currentLevel, 2) * 100;
}

/**
 * Gera uma barra de progresso visual.
 */
export function getXPProgressBar(xp) {
  const currentLevel = calculateLevel(xp);
  const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100;
  const nextLevelXP = xpForNextLevel(currentLevel);
  
  const needed = nextLevelXP - currentLevelXP;
  const earned = xp - currentLevelXP;
  
  const percent = Math.floor((earned / needed) * 100);
  const totalBars = 10;
  const filledBars = Math.floor((percent / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  
  return {
    bar: "🟦".repeat(filledBars) + "⬜".repeat(emptyBars),
    percent,
    remaining: nextLevelXP - xp
  };
}

/**
 * Adiciona XP a um usuário (centralizado).
 */
export function addGlobalXP(groupId, userId, amount) {
  try {
    const db = readJSON(DB_PATH);
    if (!db[groupId] || !db[groupId][userId]) return { ok: false };

    const user = db[groupId][userId];
    const oldLevel = calculateLevel(user.xp || 0);
    
    user.xp = (user.xp || 0) + amount;
    const newLevel = calculateLevel(user.xp);

    writeJSON(DB_PATH, db);

    return {
      ok: true,
      leveledUp: newLevel > oldLevel,
      newLevel,
      xp: user.xp
    };
  } catch (err) {
    console.error("Erro ao adicionar XP:", err);
    return { ok: false, error: err.message };
  }
}
