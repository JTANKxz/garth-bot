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
    name: "saldo",
    aliases: ["money", "bal"],
    description: "Veja quanto fyne coins você tem 💳",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const db = loadDB();
            if (!db[from]) db[from] = {};

            let target;
            if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                target = msg.message.extendedTextMessage.contextInfo.participant;
            } else {
                target = sender;
            }

            if (!db[from][target]) {
                db[from][target] = { money: 0 };
                fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            }

            const saldo = db[from][target].money;

            const texto =
                target === sender
                    ? `💰 Seu saldo atual é: *${formatMoney(saldo)} fyne coins*`
                    : `💳 Saldo de @${target.split("@")[0]}: *${formatMoney(saldo)} fyne coins*`;

            await sock.sendMessage(
                from,
                {
                    text: texto,
                    mentions: target === sender ? [] : [target]
                },
                { quoted: msg }
            );

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando saldo:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao executar o comando saldo." },
                { quoted: msg }
            );
        }
    }
};
