import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
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
    name: "pagar",
    aliases: [],
    description: "Pague sua dívida para outro usuário",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        // Alvo
        let target;
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        }

        if (!target) {
            await sock.sendMessage(from, { text: "👤 Marque o usuário a quem deseja pagar a dívida." }, { quoted: msg });
            return;
        }

        if (target === sender) {
            await sock.sendMessage(from, { text: "🚫 Você não pode pagar dívida para si mesmo." }, { quoted: msg });
            return;
        }

        const db = loadDB();
        if (!db[from]) db[from] = {};
        if (!db[from][sender]) db[from][sender] = { money: 0, debts: {} };
        if (!db[from][target]) db[from][target] = { money: 0, debts: {} };

        const devedor = db[from][sender];
        const credor = db[from][target];

        const valorDivida = devedor.debts[target] || 0;

        if (valorDivida <= 0) {
            await sock.sendMessage(from, { text: `💤 Você não tem dívida com @${target.split("@")[0]}.`, mentions: [target] }, { quoted: msg });
            return;
        }

        if (devedor.money < valorDivida) {
            await sock.sendMessage(from, { text: `💸 Saldo insuficiente para pagar a dívida de ${formatMoney(valorDivida)} fyne coins.` }, { quoted: msg });
            return;
        }

        // Transação
        devedor.money -= valorDivida;
        credor.money += valorDivida;

        // Remove completamente a dívida quitada
        delete devedor.debts[target];

        saveDB(db);

        await sock.sendMessage(from, {
            text: `✅ Você pagou *${formatMoney(valorDivida)} fyne coins* para @${target.split("@")[0]}.\n💰 Saldo atual: *${formatMoney(devedor.money)} fyne coins*`,
            mentions: [target]
        }, { quoted: msg });

    }
};
