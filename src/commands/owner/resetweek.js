import { simpleMessageCount, saveCounts } from '../../features/simpleMessageCounts.js'

export default {
    name: "resetweek",
    aliases: ["resetsemana", "zerarsemana"],
    description: "Reseta todas as contagens semanais de mensagens do grupo",
    category: "owner",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            
            for (let group in simpleMessageCount) {
                simpleMessageCount[group] = {};
            }

            saveCounts();

            await sock.sendMessage(from, { 
                text: "✅ Todas as contagens semanais foram resetadas com sucesso!",
                mentions: [msg.key.participant || msg.key.remoteJid]
            }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando resetweek:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao resetar as contagens semanais." },
                { quoted: msg }
            );
        }
    }
};
