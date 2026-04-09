import { createChallenge } from '../../features/games/velha/index.js';

export default {
    name: "jgvelha",
    description: "Desafia alguém para um jogo da velha",
    aliases: ["velha"],
    showInMenu: true,
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            await createChallenge(sock, msg);

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando jgvelha:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao tentar iniciar o jogo da velha." },
                { quoted: msg }
            );
        }
    }
};
