import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/jobs.json");

function loadDB() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Remove todos os dados de job de um usuário
export function removeJobsUser(groupJid, userJid) {
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
