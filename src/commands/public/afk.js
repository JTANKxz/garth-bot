import { readJSON, writeJSON } from "../../utils/readJSON.js";

const DB_AFK = "database/afk.json";

export default {
    name: "afk",
    description: "Define um status de ausência (AFK)",
    category: "utils",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        const db = readJSON(DB_AFK) || {};

        if (args[0]?.toLowerCase() === "off" || args[0]?.toLowerCase() === "voltei") {
            if (!db[sender]) return sock.sendMessage(from, { text: "❌ Você não está AFK." }, { quoted: msg });
            
            delete db[sender];
            writeJSON(DB_AFK, db);
            return sock.sendMessage(from, { text: `👋 *Bem-vindo de volta, ${pushName}!* Seu status AFK foi removido.` }, { quoted: msg });
        }

        const reason = args.join(" ") || "Ausente";
        db[sender] = {
            reason,
            time: Date.now()
        };

        writeJSON(DB_AFK, db);

        await sock.sendMessage(from, { 
            text: `💤 *STATUS AFK ATIVADO*\n\n👤 *Usuário:* @${sender.split("@")[0]}\n📝 *Motivo:* ${reason}\n\n_Para sair, use !afk off_`,
            mentions: [sender]
        }, { quoted: msg });
    }
};
