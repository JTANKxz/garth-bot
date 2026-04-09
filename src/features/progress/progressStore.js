// src/features/progress/progressStore.js
import fs from "fs";
import path from "path";

const FILE = path.resolve("src/database/conquistas.json");

// Garante que o arquivo exista e seja válido
function ensureFile() {
    if (!fs.existsSync(FILE)) {
        fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
        return;
    }

    const content = fs.readFileSync(FILE, "utf-8").trim();
    if (!content) {
        fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
    }
}

function load() {
    ensureFile();

    try {
        return JSON.parse(fs.readFileSync(FILE, "utf-8"));
    } catch (err) {
        console.error("⚠️ conquistas.json corrompido, resetando...");
        fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
        return {};
    }
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getGroup(db, groupId) {
    if (!db[groupId]) db[groupId] = {};
    return db[groupId];
}

function getUser(db, groupId, user) {
    const group = getGroup(db, groupId);

    if (!group[user]) {
        group[user] = {
            stats: {},
            achievements: []
        };
    }

    return group[user];
}

// =========================
// 📊 STATS
// =========================

export function incrementStat(groupId, user, stat, amount = 1) {
    const db = load();
    const u = getUser(db, groupId, user);

    u.stats[stat] = (u.stats[stat] || 0) + amount;

    save(db);
    return u.stats[stat];
}

export function getStat(groupId, user, stat) {
    const db = load();
    return db[groupId]?.[user]?.stats?.[stat] || 0;
}

// =========================
// 🏆 ACHIEVEMENTS
// =========================

export function hasAchievement(groupId, user, id) {
    const db = load();
    return db[groupId]?.[user]?.achievements?.includes(id) || false;
}

export function addAchievement(groupId, user, id) {
    const db = load();
    const u = getUser(db, groupId, user);

    if (!u.achievements.includes(id)) {
        u.achievements.push(id);
        save(db);
    }
}

// =========================
// 👤 PERFIL
// =========================

export function getUserProgress(groupId, user) {
    const db = load();
    return db[groupId]?.[user] || {
        stats: {},
        achievements: []
    };
}

// =========================
// 🗑️ REMOVER USUÁRIO
// =========================

export function removeUser(groupId, user) {
    const db = load();

    if (db[groupId] && db[groupId][user]) {
        delete db[groupId][user];

        // se o grupo ficar vazio, limpa também
        if (Object.keys(db[groupId]).length === 0) {
            delete db[groupId];
        }

        save(db);
    }
}
