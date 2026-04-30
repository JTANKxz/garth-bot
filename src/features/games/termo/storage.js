/**
 * src/features/games/termo/storage.js
 * Persistência do jogo Termo em database/termo.json
 */

import { readJSON, writeJSON } from "../../../utils/readJSON.js";

const DB_PATH = "database/termo.json";

/**
 * Retorna a data atual no formato YYYY-MM-DD (fuso de Brasília).
 */
export function getTodayDate() {
  const now = new Date();
  // UTC-3 (Brasília)
  const offset = -3 * 60;
  const local = new Date(now.getTime() + offset * 60000);
  return local.toISOString().split("T")[0];
}

/**
 * Carrega o banco do Termo.
 */
export function loadTermoDB() {
  return readJSON(DB_PATH) || {};
}

/**
 * Salva o banco do Termo.
 */
export function saveTermoDB(db) {
  writeJSON(DB_PATH, db);
}

/**
 * Garante que a estrutura do usuário existe.
 */
function ensureUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) db[groupId][userId] = {};
  return db[groupId][userId];
}

/**
 * Retorna a sessão atual do usuário (ou null se não existir).
 */
export function getUserSession(groupId, userId) {
  const db = loadTermoDB();
  return db[groupId]?.[userId]?.session || null;
}

/**
 * Salva a sessão do usuário.
 */
export function setUserSession(groupId, userId, session) {
  const db = loadTermoDB();
  const user = ensureUser(db, groupId, userId);
  user.session = session;
  saveTermoDB(db);
}

/**
 * Verifica se o usuário já jogou hoje.
 */
export function hasPlayedToday(groupId, userId) {
  const db = loadTermoDB();
  const user = db[groupId]?.[userId];
  if (!user?.session) return false;

  const today = getTodayDate();
  return user.session.date === today && user.session.status !== "playing";
}

/**
 * Verifica se o usuário tem um jogo ativo.
 */
export function hasActiveGame(groupId, userId) {
  const db = loadTermoDB();
  const user = db[groupId]?.[userId];
  if (!user?.session) return false;

  const today = getTodayDate();
  return user.session.date === today && user.session.status === "playing";
}
