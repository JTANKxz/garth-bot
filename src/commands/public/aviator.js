import { startAviator } from "../../features/games/aviator/index.js";

const cooldowns = new Map();

export default {
    name: "aviator",
    description: "Jogue o jogo do Aviãozinho (Crash). Aposte e defina um multiplicador alvo!",
    aliases: ["crash", "aviao"],
    showInMenu: true,
    category: "fun",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // Cooldown de 1 minuto (60000 ms)
        const now = Date.now();
        const cooldownKey = `${from}_${sender}`;
        const lastGame = cooldowns.get(cooldownKey) || 0;
        const COOLDOWN_MS = 60 * 1000;

        if (now - lastGame < COOLDOWN_MS) {
            const timeLeft = Math.ceil((COOLDOWN_MS - (now - lastGame)) / 1000);
            return sock.sendMessage(from, { text: `⏳ Aguarde *${timeLeft}s* para jogar Aviator novamente.` }, { quoted: msg });
        }

        try {
            if (args.length < 2) {
                return sock.sendMessage(from, { text: "❌ Uso correto: `!aviator [aposta] [multiplicador]`\nExemplo: `!aviator 500 2.0`\n\n*Nota:* O multiplicador deve estar entre 1.1x e 10.0x." }, { quoted: msg });
            }

            const betAmount = parseInt(args[0]);
            let targetMultiplier = parseFloat(args[1].replace(",", "."));

            if (isNaN(betAmount) || betAmount < 10) {
                return sock.sendMessage(from, { text: "❌ Valor de aposta inválido. A aposta mínima é 10." }, { quoted: msg });
            }

            if (isNaN(targetMultiplier) || targetMultiplier < 1.1 || targetMultiplier > 10.0) {
                return sock.sendMessage(from, { text: "❌ Multiplicador alvo inválido. Escolha um valor entre 1.1x e 10.0x.\nExemplo: `!aviator 500 2.0`" }, { quoted: msg });
            }

            cooldowns.set(cooldownKey, now);
            
            await startAviator(sock, msg, betAmount, targetMultiplier);
            
        } catch (err) {
            console.error("Erro no comando aviator:", err);
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao tentar iniciar o Aviator." },
                { quoted: msg }
            );
        }
    }
};
