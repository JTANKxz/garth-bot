import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

// =========================
// 📦 DB
// =========================

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function ensureUser(db, groupId, user) {
    if (!db[groupId]) db[groupId] = {};
    if (!db[groupId][user]) {
        db[groupId][user] = {
            money: 0,
            lastUsed: 0
        };
    }
}

// =========================
// 💰 SALDO & ECONOMIA
// =========================

export const CURRENCY_NAME = "fyne coins";

export function formatNumber(num) {
    return num.toLocaleString("pt-BR");
}

export function formatMoney(amount) {
    return `${formatNumber(amount)} ${CURRENCY_NAME}`;
}

export function getUserBalance(groupId, user) {
    const db = loadDB();
    return db[groupId]?.[user]?.money || 0;
}

export function addUserBalance(groupId, user, amount) {
    if (!amount || amount <= 0) return getUserBalance(groupId, user);

    const db = loadDB();
    ensureUser(db, groupId, user);

    db[groupId][user].money += amount;

    saveDB(db);
    return db[groupId][user].money;
}

export function removeUserBalance(groupId, user, amount) {
    if (!amount || amount <= 0) return getUserBalance(groupId, user);

    const db = loadDB();
    ensureUser(db, groupId, user);

    db[groupId][user].money -= amount;

    if (db[groupId][user].money < 0) {
        db[groupId][user].money = 0;
    }

    saveDB(db);
    return db[groupId][user].money;
}

export function setUserBalance(groupId, user, amount) {
    const db = loadDB();
    ensureUser(db, groupId, user);

    db[groupId][user].money = Math.max(0, amount);

    saveDB(db);
    return db[groupId][user].money;
}

// Aliases para compatibilidade
export {
    addUserBalance as addMoney,
    removeUserBalance as removeMoney
};
