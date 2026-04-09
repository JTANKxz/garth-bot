import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: "grupomgr",
    aliases: ["gestaogrupos", "grupos"],
    description: "Gerenciamento remoto de grupos (Apenas Criador)",
    category: "creator",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const botConfig = getBotConfig();

        if (sender !== botConfig.botCreator) {
            return sock.sendMessage(from, { text: "❌ Apenas o Criador pode usar este comando." }, { quoted: msg });
        }

        const subCommand = args[0]?.toLowerCase();

        if (subCommand === "list") {
            const groups = await sock.groupFetchAllParticipating();
            const groupList = Object.values(groups);

            let text = `🏘️ *LISTA DE GRUPOS ATIVOS*\n\n`;
            groupList.forEach((g, i) => {
                text += `${i + 1}. *${g.subject}*\n` +
                        `> 🆔 ID: ${g.id}\n` +
                        `> 👥 Membros: ${g.participants.length}\n\n`;
            });

            if (groupList.length === 0) text = "📭 O bot não está em nenhum grupo no momento.";

            return sock.sendMessage(from, { text }, { quoted: msg });
        }

        if (subCommand === "leave") {
            const targetJid = args[1];
            if (!targetJid) return sock.sendMessage(from, { text: "❌ Informe o ID do grupo para sair.\nEx: !grupomgr leave 120363xxx@g.us" }, { quoted: msg });

            try {
                await sock.groupLeave(targetJid);
                return sock.sendMessage(from, { text: `✅ O bot saiu do grupo *${targetJid}* com sucesso.` }, { quoted: msg });
            } catch (err) {
                return sock.sendMessage(from, { text: `❌ Erro ao tentar sair do grupo: ${err.message}` }, { quoted: msg });
            }
        }

        if (subCommand === "info") {
            const targetJid = args[1];
            if (!targetJid) return sock.sendMessage(from, { text: "❌ Informe o ID do grupo." }, { quoted: msg });

            try {
                const meta = await sock.groupMetadata(targetJid);
                const text = `ℹ️ *DETALHES DO GRUPO*\n\n` +
                             `*Nome:* ${meta.subject}\n` +
                             `*ID:* ${meta.id}\n` +
                             `*Dono:* @${meta.owner?.split("@")[0] || "Desconhecido"}\n` +
                             `*Membros:* ${meta.participants.length}\n` +
                             `*Criado em:* ${new Date(meta.creation * 1000).toLocaleString("pt-BR")}`;
                
                return sock.sendMessage(from, { text, mentions: [meta.owner].filter(Boolean) }, { quoted: msg });
            } catch (err) {
                return sock.sendMessage(from, { text: `❌ Erro ao buscar informações: ${err.message}` }, { quoted: msg });
            }
        }

        // Default: Ajuda
        return sock.sendMessage(from, { 
            text: `🏘️ *GESTOR DE GRUPOS*\n\n` +
                  `👉 !grupomgr list - Lista todos os grupos\n` +
                  `👉 !grupomgr info [id] - Detalhes do grupo\n` +
                  `👉 !grupomgr leave [id] - Faz o bot sair do grupo`
        }, { quoted: msg });
    }
};
