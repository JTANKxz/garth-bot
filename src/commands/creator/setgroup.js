import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { getBotConfig } from "../../config/botConfig.js";

const GROUPS_DB = "database/groups.json";

export default {
    name: "setgroup",
    aliases: ["configgrupo"],
    description: "Altera configurações específicas de um grupo pelo ID (Apenas Criador)",
    category: "creator",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const botConfig = getBotConfig();

        if (sender !== botConfig.botCreator) {
            return sock.sendMessage(from, { text: "❌ Apenas o Criador pode usar este comando." }, { quoted: msg });
        }

        const targetJid = args[0];
        const key = args[1];
        const value = args[2];

        if (!targetJid || !key || value === undefined) {
            return sock.sendMessage(from, { 
                text: `⚙️ *CONFIGURAÇÃO POR GRUPO*\n\n` +
                      `👉 Use: !setgroup [ID_DO_GRUPO] [chave] [valor]\n` +
                      `Ex: !setgroup 120363xxx@g.us win_rate_base 60\n\n` +
                      `*Dica:* Use !grupomgr list para pegar os IDs.`
            }, { quoted: msg });
        }

        try {
            const db = readJSON(GROUPS_DB) || {};
            
            if (!db[targetJid]) {
                return sock.sendMessage(from, { text: "❌ Grupo não encontrado no banco de dados." }, { quoted: msg });
            }

            if (!db[targetJid].economy) db[targetJid].economy = {};

            const numValue = parseFloat(value);
            db[targetJid].economy[key] = isNaN(numValue) ? value : numValue;
            
            writeJSON(GROUPS_DB, db);
            
            await sock.sendMessage(from, { text: `✅ Configuração do grupo *${targetJid}* atualizada:\n> *${key}* = *${value}*` }, { quoted: msg });

        } catch (err) {
            console.error("Erro no setgroup:", err);
            await sock.sendMessage(from, { text: "❌ Erro ao atualizar o grupo." }, { quoted: msg });
        }
    }
};
