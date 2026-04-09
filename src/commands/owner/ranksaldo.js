import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath));
}

function formatNumber(valor) {
    return valor.toLocaleString("pt-BR");
}

function formatMoney(valor) {
    if (valor >= 1_000_000_000)
        return `${formatNumber(valor)}B`;

    if (valor >= 1_000_000)
        return `${formatNumber(valor)}M`;

    if (valor >= 1_000)
        return `${formatNumber(valor)}K`;

    return formatNumber(valor);
}

export default {
    name: "ranksaldo",
    aliases: ["ricos"],
    description: "Mostra o ranking de saldo do grupo (top 30) 💰",
    category: "owner",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const db = loadDB();
            const users = db[from] || {};

            const sortedRanking = Object.entries(users)
                .filter(([, data]) => data && typeof data.money === "number")
                .sort(([, a], [, b]) => b.money - a.money)
                .slice(0, 30);

            if (sortedRanking.length === 0) {
                await sock.sendMessage(
                    from,
                    { text: "💰 Nenhum usuário com saldo encontrado." },
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
                    const userNumber = jid.split("@")[0];
                    const saldo = formatMoney(data.money);

                    return (
`│ ${index + 1} - @${userNumber}
│ 💰 *${saldo} fyne coins*`
                    );
                })
                .join("\n│──────────────────\n");

            const dateSP = new Date().toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
            });

            const text = `
╭──❰ 💰 *TOP 30 RICOS* ❱──╮
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
            console.error("Erro no comando ranksaldo:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao gerar o ranking." },
                { quoted: msg }
            );
        }
    }
};
