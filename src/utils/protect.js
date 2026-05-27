import { readJSON, writeJSON } from "./readJSON.js";

const dbPath = "database/protect.json";

export function getProtectedBy(groupJid, userJid) {
    try {
        const db = readJSON(dbPath) || {};
        return db[groupJid]?.[userJid] || null;
    } catch {
        return null;
    }
}

export function protectUser(groupJid, userJid, protectorJid) {
    const db = readJSON(dbPath) || {};
    if (!db[groupJid]) db[groupJid] = {};
    db[groupJid][userJid] = protectorJid;
    writeJSON(dbPath, db);
}

export function unprotectUser(groupJid, userJid) {
    const db = readJSON(dbPath) || {};
    if (db[groupJid] && db[groupJid][userJid]) {
        delete db[groupJid][userJid];
        if (Object.keys(db[groupJid]).length === 0) {
            delete db[groupJid];
        }
        writeJSON(dbPath, db);
        return true;
    }
    return false;
}
