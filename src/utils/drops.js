// src/utils/drops.js

import fs from "fs";
import path from "path";

const dropsPath = path.resolve("src/database/drops.json");

const defaultDropState = {
  active: false,
  droppedAt: 0,
  expiresAt: 0,
  openedBy: null,
  openedAt: 0,
  messageId: null, // opcional, se quiser referenciar
};

function loadDrops() {
  if (!fs.existsSync(dropsPath)) fs.writeFileSync(dropsPath, "{}", "utf-8");
  try {
    return JSON.parse(fs.readFileSync(dropsPath, "utf-8"));
  } catch {
    fs.writeFileSync(dropsPath, "{}", "utf-8");
    return {};
  }
}

function saveDrops(data) {
  fs.writeFileSync(dropsPath, JSON.stringify(data, null, 2), "utf-8");
}

export function getDrop(groupId) {
  const db = loadDrops();
  if (!db[groupId]) {
    db[groupId] = { ...defaultDropState };
    saveDrops(db);
  }
  return db[groupId];
}

export function setDrop(groupId, newData) {
  const db = loadDrops();
  if (!db[groupId]) db[groupId] = { ...defaultDropState };
  db[groupId] = { ...db[groupId], ...newData };
  saveDrops(db);
  return db[groupId];
}

export function clearDrop(groupId) {
  return setDrop(groupId, { ...defaultDropState });
}
