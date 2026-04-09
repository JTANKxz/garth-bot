import { simpleMessageCount } from '../../features/simpleMessageCounts.js'

export default {
    name: "topweek",
    aliases: ["rankweek", "topsemana"],
    description: "Mostra o ranking semanal de mensagens do grupo",
    category: "owner",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const users = simpleMessageCount[from] || {};

            const sortedRanking = Object.entries(users)
                .filter(([, count]) => typeof count === 'number')
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10);

            if (sortedRanking.length === 0) {
                await sock.sendMessage(from, {
                    text: "📊 Ninguém enviou mensagens nesta semana."
                }, { quoted: msg });

                await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
                return;
            }

            let groupName = "Grupo";
            if (from.endsWith("@g.us")) {
                try {
                    const metadata = await sock.groupMetadata(from);
                    groupName = metadata.subject || "Grupo";
                } catch {}
            }

            const lines = sortedRanking.map(([jid, messages], index) => {
                const userNumber = jid.split("@")[0];
                return `│ ${index + 1} - @${userNumber}\n│ 💬 *${messages}* msgs`;
            }).join("\n│──────────────────\n");

            const dateSP = new Date().toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
            });

            const text = `
╭──❰ 📊 *RANKING DA SEMANA* ❱──╮
│ *${groupName}* - ${dateSP}
│──────────────────
${lines}
╰──────────────────╯
            `.trim();

            await sock.sendMessage(
                from,
                {
                    text,
                    mentions: sortedRanking.map(([jid]) => jid),
                },
                { quoted: msg }
            );

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando topweek:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao gerar o ranking semanal." },
                { quoted: msg }
            );
        }
    }
};
