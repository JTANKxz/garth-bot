import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function formatNumber(valor) {
    return Number(valor).toLocaleString("pt-BR");
}

function formatMoney(valor) {
    const v = Number(valor) || 0;

    if (v >= 1_000_000_000) return `${formatNumber(v)}B`;
    if (v >= 1_000_000) return `${formatNumber(v)}M`;
    if (v >= 1_000) return `${formatNumber(v)}K`;

    return formatNumber(v);
}

function getTotalDebt(user) {
    if (!user?.debts) return 0;
    return Object.values(user.debts).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

export default {
    name: "doar",
    aliases: [],
    description: "Doe fyne coins para outro usuário 💸",
    category: "fun",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const db = loadDB();
            if (!db[from]) db[from] = {};

            // garante estrutura do doador com debts também (pra regra funcionar)
            if (!db[from][sender]) db[from][sender] = { money: 0, debts: {} };
            if (!db[from][sender].debts) db[from][sender].debts = {};

            let target = null;
            if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                target = msg.message.extendedTextMessage.contextInfo.participant;
            }

            if (!target) {
                await sock.sendMessage(
                    from,
                    { text: "👤 Você precisa mencionar ou responder a um usuário para doar." },
                    { quoted: msg }
                );
                return;
            }

            if (target === sender) {
                await sock.sendMessage(from, { text: "🚫 Você não pode doar moedas para si mesmo." }, { quoted: msg });
                return;
            }

            const valor = Number(args[args.length - 1]);
            if (!valor || valor <= 0) {
                await sock.sendMessage(from, { text: "💰 Informe um valor válido para doar." }, { quoted: msg });
                return;
            }

            if (!db[from][target]) db[from][target] = { money: 0, debts: {} };
            if (!db[from][target].debts) db[from][target].debts = {};

            const saldoDoador = Number(db[from][sender].money) || 0;

            // ✅ calcula quanto é dinheiro emprestado (dívida total)
            const dividaTotal = getTotalDebt(db[from][sender]);

            // ✅ disponível pra doar = saldo - dívidas
            const disponivelParaDoar = Math.max(0, saldoDoador - dividaTotal);

            // ❌ não pode doar dinheiro emprestado
            if (valor > disponivelParaDoar) {
                await sock.sendMessage(
                    from,
                    {
                        text:
                            `🚫 Você não pode doar dinheiro emprestado.\n\n` +
                            `💰 Disponível para doar: *${formatMoney(disponivelParaDoar)}*\n` +
                            `📌 Seu saldo: *${formatMoney(saldoDoador)}*\n` +
                            `🧾 Dívidas: *${formatMoney(dividaTotal)}*`,
                    },
                    { quoted: msg }
                );
                return;
            }

            // transferência
            db[from][sender].money -= valor;
            db[from][target].money += valor;

            saveDB(db);

            const texto =
                `💸 *${msg.pushName || "Você"}* doou *${formatMoney(valor)}* ` +
                `para @${target.split("@")[0]} 💰`;

            await sock.sendMessage(
                from,
                {
                    text: texto,
                    mentions: [target],
                },
                { quoted: msg }
            );

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Erro no comando donate:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao executar o comando donate." }, { quoted: msg });
        }
    },
};