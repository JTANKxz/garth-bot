import { readJSON, writeJSON } from "../../utils/readJSON.js";

const DB_AUSENTES = "database/ausentes.json";

export default {
    name: "ausente",
    description: "Define o seu status como ausente (com aviso)",
    category: "utils",
    usage: "[motivo]",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        const db = readJSON(DB_AUSENTES) || {};

        if (args[0]?.toLowerCase() === "off" || args[0]?.toLowerCase() === "voltei") {
            if (!db[sender]) return sock.sendMessage(from, { text: "❌ Você não está ausente." }, { quoted: msg });
            
            delete db[sender];
            writeJSON(DB_AUSENTES, db);
            return sock.sendMessage(from, { text: `👋 *Bem-vindo de volta, ${pushName}!* Seu status de ausente foi removido.` }, { quoted: msg });
        }

        const reason = args.join(" ") || "Sem motivo especificado.";
        
        db[sender] = {
            reason,
            time: Date.now()
        };

        writeJSON(DB_AUSENTES, db);

        await sock.sendMessage(from, { 
            text: `💤 *STATUS AUSENTE ATIVADO*\n\n👤 *Usuário:* @${sender.split("@")[0]}\n📝 *Motivo:* ${reason}\n\n_Serei avisado se alguém te marcar. Para sair do status, basta enviar qualquer mensagem no grupo._`,
            mentions: [sender]
        }, { quoted: msg });
    }
};
