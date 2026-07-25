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
    name: "caloteiros",
    aliases: ["caloteiro", "meudevedores", "medevem"],
    description: "Mostra quem está te devendo no grupo",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        const db = loadDB();
        const groupData = db[from];

        if (!groupData) {
            return sock.sendMessage(from, { text: `📌 *${pushName}*, ninguém te deve nada neste grupo.` }, { quoted: msg });
        }

        // Varre todos os usuários do grupo e verifica quem tem dívida com o sender
        const caloteiros = [];

        for (const [userId, userData] of Object.entries(groupData)) {
            if (userId === sender) continue; // pula o próprio sender
            const debts = userData.debts || {};
            if (debts[sender] && debts[sender] > 0) {
                caloteiros.push({ id: userId, amount: debts[sender] });
            }
        }

        if (caloteiros.length === 0) {
            return sock.sendMessage(from, { text: `📌 *${pushName}*, ninguém está te devendo no momento. Você é rico e honrado! 😌` }, { quoted: msg });
        }

        // Ordena do maior devedor pro menor
        caloteiros.sort((a, b) => b.amount - a.amount);

        const total = caloteiros.reduce((sum, c) => sum + c.amount, 0);

        const lista = caloteiros
            .map((c, i) => `${i + 1}. @${c.id.split("@")[0]} — *${formatMoney(c.amount)} fyne coins*`)
            .join("\n");

        const text =
            `💸 *CALOTEIROS DE ${pushName.toUpperCase()}*\n\n` +
            `${lista}\n\n` +
            `📊 *Total a receber:* ${formatMoney(total)} fyne coins`;

        const mentions = caloteiros.map(c => c.id);

        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    }
};
