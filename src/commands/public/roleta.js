//src/commands/public/roleta.js
export default {
    name: "roleta",
    aliases: [],
    description: "Roleta russa: ver se sobrevive ou não",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;

        const pushName = msg.pushName || "Usuário";

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const resultado = Math.floor(Math.random() * 6) + 1;

            let resposta;

            if (resultado === 1) {
                resposta = `💥 *${pushName} puxou o gatilho... e morreu!* 💀`;
            } else {
                resposta = `*${pushName} puxou o gatilho... e sobreviveu!*`;
            }

            await sock.sendMessage(
                from,
                { text: resposta },
                { quoted: msg }
            );

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando roleta:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao executar a roleta." },
                { quoted: msg }
            );
        }
    }
};
