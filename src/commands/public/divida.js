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
    if (valor >= 1_000_000_000) return `${formatNumber(valor)}B`;
    if (valor >= 1_000_000) return `${formatNumber(valor)}M`;
    if (valor >= 1_000) return `${formatNumber(valor)}K`;
    return formatNumber(valor);
}

export default {
    name: "divida",
    aliases: ["dividas", "devedores"],
    description: "Mostra a quem você deve no grupo",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        const db = loadDB();
        if (!db[from] || !db[from][sender]) {
            await sock.sendMessage(from, { text: `📌 *${pushName}*, você não possui dívidas neste grupo.` }, { quoted: msg });
            return;
        }

        const debts = db[from][sender].debts || {};
        const debtEntries = Object.entries(debts);

        if (!debtEntries.length) {
            await sock.sendMessage(from, { text: `📌 *${pushName}*, você não deve nada a ninguém.` }, { quoted: msg });
            return;
        }

        const debtList = debtEntries
            .map(([creditor, amount]) => `@${creditor.split("@")[0]}: ${formatMoney(amount)} fyne coins`)
            .join("\n");

        const text = `💰 *Dívidas de ${pushName}:*\n\n${debtList}`;

        await sock.sendMessage(from, { text, mentions: debtEntries.map(([c]) => c) }, { quoted: msg });
    }
};
