import { readJSON } from "../../utils/readJSON.js";
import { commands } from "../../handler/commandsHandler.js";
import moment from "moment-timezone";

export default {
    name: "info",
    aliases: ["botinfo", "stats"],
    description: "Mostra informações e estatísticas do bot",
    category: "utils",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;

        try {
            // 1. Carregar Dados de Mensagens (para usuários e grupos)
            const messageCounts = readJSON("database/messageCounts.json");
            const allGroups = Object.keys(messageCounts);
            let totalUsers = 0;
            
            allGroups.forEach(g => {
                totalUsers += Object.keys(messageCounts[g]).length;
            });

            // 2. Uptime
            const uptimeSeconds = process.uptime();
            const hours = Math.floor(uptimeSeconds / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);

            // 3. Comandos (Filtra para não mostrar Dono/Criador)
            const usage = readJSON("database/commandUsage.json") || {};
            const topCmds = Object.entries(usage)
                .filter(([name]) => {
                    const cmd = commands.get(name);
                    return cmd && cmd.category !== "owner" && cmd.category !== "creator";
                })
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, count]) => `> *${name}*: ${count}x`)
                .join("\n");

            const text = `📊 *ESTATÍSTICAS DO BOT*\n` +
                `══════════════════\n` +
                `👥 *Total de Usuários:* ${totalUsers}\n` +
                `🏘️ *Total de Grupos:* ${allGroups.length}\n` +
                `⏳ *Bot Online há:* ${hours}h ${minutes}min\n` +
                `══════════════════\n` +
                (topCmds ? `🔥 *Comandos Mais Usados:*\n${topCmds}\n` : "") +
                `══════════════════\n` +
                `> 🤖 *GARTH-BOT V5*`;

            await sock.sendMessage(from, { text }, { quoted: msg });

        } catch (err) {
            console.error("Erro no comando info:", err);
            await sock.sendMessage(from, { text: "❌ Erro ao carregar as informações." }, { quoted: msg });
        }
    }
};
