import { messageCount } from '../../features/messageCounts.js'

export default {
    name: "podio",
    aliases: [],
    description: "Mostra o ranking de vitórias do grupo",
    category: "owner",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const users = messageCount[from] || {};

            const sortedRanking = Object.entries(users)
                .filter(([, data]) =>
                    data &&
                    typeof data === "object" &&
                    typeof data.victories !== "undefined"
                )
                .sort(([, a], [, b]) => (b.victories || 0) - (a.victories || 0))
                .slice(0, 10);

            if (sortedRanking.length === 0) {
                await sock.sendMessage(
                    from,
                    { text: "📊 Ninguém possui vitórias registradas ainda." },
                    { quoted: msg }
                );

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

            const lines = sortedRanking
                .map(([jid, data], index) => {
                    const name = jid.split("@")[0];
                    const wins = data.victories || 0;

                    return (
`│ ${index + 1} - @${name}
│ ⚔️ *${wins}* vitórias`
                    );
                })
                .join("\n│──────────────────\n");

            const dateSP = new Date().toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
            });

            const text = `
╭──❰ 🏆 *Vitórias das Lutas* ❱──╮
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
            console.error("Erro no comando podio:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao gerar o pódio." },
                { quoted: msg }
            );
        }
    }
};
