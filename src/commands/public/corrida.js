import { startRace } from "../../features/games/corrida/index.js";
const cooldowns = new Map();

export default {
    name: "corrida",
    description: "Inicia uma corrida animada de cavalos no grupo",
    aliases: ["cavalos"],
    showInMenu: true,
    category: "fun",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // Cooldown de 2 minutos (120000 ms)
        const now = Date.now();
        const lastRace = cooldowns.get(sender) || 0;
        const COOLDOWN_MS = 2 * 60 * 1000;

        if (now - lastRace < COOLDOWN_MS) {
            const timeLeft = Math.ceil((COOLDOWN_MS - (now - lastRace)) / 1000);
            return sock.sendMessage(from, { text: `⏳ Aguarde *${timeLeft}s* para apostar na corrida novamente.` }, { quoted: msg });
        }

        try {
            // Se for com aposta (mais de 1 argumento), aplica o cooldown
            if (args.length >= 2) {
                cooldowns.set(sender, now);
            }
            
            await startRace(sock, msg, args);
        } catch (err) {
            console.error("Erro no comando corrida:", err);
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao tentar iniciar a corrida." },
                { quoted: msg }
            );
        }
    }
};
