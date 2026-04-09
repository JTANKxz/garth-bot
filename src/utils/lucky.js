import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function removeLuckyUser(groupJid, userJid) {
    const db = loadDB();

    if (db[groupJid] && db[groupJid][userJid]) {
        delete db[groupJid][userJid];

        // se o grupo ficar vazio, limpa também
        if (Object.keys(db[groupJid]).length === 0) {
            delete db[groupJid];
        }

        saveDB(db);
    }
}
