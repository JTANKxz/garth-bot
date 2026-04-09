import os from "os";
import { getBotConfig } from "../../config/botConfig.js";
import { commands } from "../../handler/commandsHandler.js";

export default {
    name: "ping",
    aliases: [],
    description: "Mostra a latência e estatísticas do bot",
    category: "utils",

    async run({ sock, msg }) {
        try {
            const jid = msg.key.remoteJid;

            // início da medição
            const start = process.hrtime.bigint();

            // grupos
            //const groups = Object.values(await sock.groupFetchAllParticipating());
            //const totalGroups = groups.length;

            const totalCommands = commands.size;

            const botConfig = getBotConfig();
            const creatorId = botConfig.botCreator;

            const formatUser = (jid) => `@${jid.split("@")[0]}`;

            // uptime
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

            // RAM
            const usedRam = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const totalRam = (os.totalmem() / 1024 / 1024).toFixed(2);

            // fim da medição
            const end = process.hrtime.bigint();
            const latency = Number(end - start) / 1e6;
            const formattedLatency = latency.toFixed(2);

//> 💾 *RAM:* ${usedRam}MB / ${totalRam}MB
            const text = `
🌐 *${botConfig.botName}*
━━━━━━━━━━━━━━━━━━━
> ⚡ *Latência:* ${formattedLatency}ms
> 🧩 *Comandos:* ${totalCommands}
> ⏳ *Tempo ativo:* ${formattedUptime}

> 🤖 *Criado por:* ${formatUser(creatorId)}
`.trim();

            await sock.sendMessage(jid, {
                text,
                mentions: [creatorId]
            });

        } catch (err) {
            console.error("Erro no comando ping:", err);
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: "❌ Ocorreu um erro ao medir o ping." },
                { quoted: msg }
            );
        }
    }
};