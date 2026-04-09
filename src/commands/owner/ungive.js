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

function isInfinity(valor) {
    return typeof valor === "string" && valor.includes("q9q9+");
}

function formatNumber(valor) {
    return valor.toLocaleString("pt-BR");
}

function formatMoney(valor) {
    if (isInfinity(valor)) return valor;

    if (valor > 100_000_000_000) return "q9q9+";

    if (valor >= 1_000_000_000)
        return `${formatNumber(valor)}B`;

    if (valor >= 1_000_000)
        return `${formatNumber(valor)}M`;

    if (valor >= 1_000)
        return `${formatNumber(valor)}K`;

    return formatNumber(valor);
}

export default {
    name: "ungive",
    aliases: [],
    description: "Remove money de um usuário específico",
    category: "owner",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        try {
            const db = loadDB();
            if (!db[from]) db[from] = {};

            let target;
            if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else {
                
                target = sender;
            }

            if (target === sender && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                return;
            }

            const valor = parseInt(args[args.length - 1]);
            if (!valor || valor <= 0) {
                await sock.sendMessage(
                    from,
                    { text: "Informe um valor válido." },
                    { quoted: msg }
                );
                return;
            }

            if (!db[from][target]) {
                db[from][target] = { money: 0, lastUsed: 0 };
            }

            const currentMoney = db[from][target].money;
            db[from][target].money = isInfinity(currentMoney)
                ? "q9q9+" 
                : Math.max(0, currentMoney - valor); 

            saveDB(db);

            const texto =
                target === sender
                    ? `Saldo removido.\nValor: ${formatMoney(valor)}\nTotal atual: ${formatMoney(db[from][target].money)}`
                    : `Usuário: @${target.split("@")[0]}\nValor removido: ${formatMoney(valor)}\nTotal atual: ${formatMoney(db[from][target].money)}`;

            await sock.sendMessage(
                from,
                {
                    text: texto,
                    mentions: target === sender ? [] : [target]
                },
                { quoted: msg }
            );

        } catch (err) {
            console.error("Erro no comando ungive:", err);

            await sock.sendMessage(from, { text: "Ocorreu um erro ao executar o comando ungive." }, { quoted: msg });
        }
    }
};
