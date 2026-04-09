import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { getUserBalance, addMoney, removeMoney, formatMoney } from "../../utils/saldo.js";
import { getBotConfig } from "../../config/botConfig.js";

import { getSetting } from "../../utils/economyManager.js";

const DB_LOTTERY = "database/lottery.json";
// O TICKET_PRICE agora é lido dinamicamente dentro do run

function ensureGroup(db, from) {
    if (!db[from]) {
        db[from] = {
            pot: 0,
            tickets: [] // Array de { userId, count }
        };
    }
    return db[from];
}

export default {
    name: "loteria",
    aliases: ["sorteio", "bolao"],
    description: "Sistema de loteria do grupo",
    category: "fun",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";
        const botConfig = getBotConfig();

        if (!from.endsWith("@g.us")) return;
        const ticketPrice = getSetting(from, "lottery_ticket_price");

        try {
            const db = readJSON(DB_LOTTERY) || {};
            const groupData = ensureGroup(db, from);

            const subCommand = args[0]?.toLowerCase();

            // 1. COMPRAR TICKETS
            if (subCommand === "comprar") {
                const qty = parseInt(args[1]) || 1;
                if (qty <= 0) return sock.sendMessage(from, { text: "❌ Quantidade inválida." }, { quoted: msg });

                const cost = qty * ticketPrice;
                const balance = getUserBalance(from, sender);

                if (balance < cost) {
                    return sock.sendMessage(from, { text: `❌ Você não tem moedas suficientes! (Custo: ${formatMoney(cost)})` }, { quoted: msg });
                }

                removeMoney(from, sender, cost);
                groupData.pot += cost;

                // Adiciona os tickets (um por entrada para o sorteio ser justo por peso)
                for (let i = 0; i < qty; i++) {
                    groupData.tickets.push(sender);
                }

                writeJSON(DB_LOTTERY, db);

                return sock.sendMessage(from, { text: `✅ *${pushName}* comprou *${qty}* tickets da loteria!\n💰 Pote atual: *${formatMoney(groupData.pot)}*` }, { quoted: msg });
            }

            // 2. SORTEAR (Criador apenas)
            if (subCommand === "sortear") {
                if (sender !== botConfig.botCreator) {
                    return sock.sendMessage(from, { text: "❌ Apenas o Criador do Bot pode realizar o sorteio manual." }, { quoted: msg });
                }

                if (groupData.tickets.length === 0) {
                    return sock.sendMessage(from, { text: "❌ Não há tickets vendidos neste grupo para sortear." }, { quoted: msg });
                }

                const winnerIndex = Math.floor(Math.random() * groupData.tickets.length);
                const winnerId = groupData.tickets[winnerIndex];
                const prize = groupData.pot;

                addMoney(from, winnerId, prize);

                const text = `🎉 *SORTEIO REALIZADO!*\n\n` +
                    `🏆 *Vencedor:* @${winnerId.split("@")[0]}\n` +
                    `💰 *Prêmio:* ${formatMoney(prize)}!\n\n` +
                    `Parabéns! O pote foi zerado para o próximo round.`;

                groupData.pot = 0;
                groupData.tickets = [];
                writeJSON(DB_LOTTERY, db);

                return sock.sendMessage(from, { text, mentions: [winnerId] }, { quoted: msg });
            }

            // 3. STATUS (Padrão)
            const userTickets = groupData.tickets.filter(t => t === sender).length;
            const status = `🎰 *LOTERIA DO GRUPO*\n` +
                `══════════════════\n` +
                `💰 *Pote Atual:* ${formatMoney(groupData.pot)} fyne coins\n` +
                `🎫 *Preço do Ticket:* ${formatMoney(ticketPrice)}\n` +
                `🎟️ *Seus Tickets:* ${userTickets}\n` +
                `📈 *Sua Chance:* ${groupData.tickets.length > 0 ? ((userTickets / groupData.tickets.length) * 100).toFixed(2) : 0}%\n` +
                `══════════════════\n` +
                `👉 Use: *!loteria comprar [qtd]* para participar.\n` +
                `🍀 Boa sorte!`;

            await sock.sendMessage(from, { text: status }, { quoted: msg });

        } catch (err) {
            console.error("Erro no comando loteria:", err);
            await sock.sendMessage(from, { text: "❌ Erro ao processar a loteria." }, { quoted: msg });
        }
    }
};
