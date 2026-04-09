import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export default {
    category: "owner",
    name: "resetsaldo",
    aliases: ["clearsaldo"],
    description: "Reseta todo o saldo do grupo atual",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const db = loadDB();

            db[jid] = {};

            saveDB(db);

            await sock.sendMessage(jid, {
                text:
                    `Todos os saldos foram apagados com sucesso.`
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no reset:", err);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, {
                text: "❌ Ocorreu um erro ao resetar os saldos do grupo."
            }, { quoted: msg });
        }
    }
};
