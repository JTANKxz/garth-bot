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
    if (valor >= 1_000_000_000)
        return `${formatNumber(valor)}B`;

    if (valor >= 1_000_000)
        return `${formatNumber(valor)}M`;

    if (valor >= 1_000)
        return `${formatNumber(valor)}K`;

    return formatNumber(valor);
}

export default {
    name: "tank",
    aliases: [],
    description: "Adiciona fyne coins a um usuário específico 💰",
    category: "owner",
    showInMenu: false,

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const db = loadDB();
            if (!db[from]) db[from] = {};

            let target;
            if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else {
                target = sender;
            }

            const valor = parseInt(args[args.length - 1]);
            if (!valor || valor <= 0) {
                await sock.sendMessage(
                    from,
                    { text: "💸 Informe um valor válido." },
                    { quoted: msg }
                );
                return;
            }

            if (!db[from][target]) {
                db[from][target] = { money: 0 };
            }

            db[from][target].money += valor;

            saveDB(db);

            const texto =
                target === sender
                    ? `✅ Saldo adicionado com sucesso!\n💰 Valor: *${formatMoney(valor)} cash*\n📊 Total atual: *${formatMoney(db[from][target].money)} cash*`
                    : `👤 Usuário: @${target.split("@")[0]}\n💰 Valor: *${formatMoney(valor)} cash*\n📊 Total atual: *${formatMoney(db[from][target].money)} cash*`;

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
            console.error("Erro no comando addsaldo:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao executar o comando addsaldo." },
                { quoted: msg }
            );
        }
    }
};
