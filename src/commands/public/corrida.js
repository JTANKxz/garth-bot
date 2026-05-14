import { startRace } from "../../features/games/corrida/index.js";

export default {
    name: "corrida",
    description: "Inicia uma corrida animada de animais no grupo",
    aliases: ["cavalos"],
    showInMenu: true,
    category: "fun",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;

        try {
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
