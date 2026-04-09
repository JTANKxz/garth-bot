import { messageCount } from '../../features/messageCounts.js'

export default {
    name: "ranking",
    aliases: [],
    description: "Mostra o ranking de mensagens do grupo",
    category: "owner",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const users = messageCount[from] || {};

            const sortedRanking = Object.entries(users)
                .filter(([, data]) =>
                    data &&
                    typeof data === 'object' &&
                    typeof data.messages === 'number'
                )
                .sort(([, a], [, b]) => b.messages - a.messages)
                .slice(0, 10);

            if (sortedRanking.length === 0) {
                await sock.sendMessage(from, {
                    text: "📊 Ninguém enviou mensagens ainda."
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

            const lines = sortedRanking.map(([jid, data], index) => {
                const userNumber = jid.split("@")[0];
                const pop = data.popularity || 0;

                return (
`│ ${index + 1} - @${userNumber}
│ 💬 *${data.messages}* msgs`
                );
            }).join("\n│──────────────────\n");

            const dateSP = new Date().toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
            });

            const text = `
╭──❰ 📊 *TOP 10 ATIVOS* ❱──╮
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
            console.error("Erro no comando ranking:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao gerar o ranking." },
                { quoted: msg }
            );
        }
    }
};
