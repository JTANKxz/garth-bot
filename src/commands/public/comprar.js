import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { getShopItems } from "../../utils/economyManager.js";
import { addMessages, addPopularity, initializeAttributes } from "../../features/messageCounts.js";

const DB_LUCKY = "database/lucky.json";

function durationToMs(duration) {
    if (!duration) return 0;
    const d = String(duration).toLowerCase().trim();
    const hoursMatch = d.match(/(\d+)\s*h/);
    if (hoursMatch) return parseInt(hoursMatch[1], 10) * 60 * 60 * 1000;
    const daysMatch = d.match(/(\d+)\s*dia/);
    if (daysMatch) return parseInt(daysMatch[1], 10) * 24 * 60 * 60 * 1000;
    return 0;
}

function applyTimedItem(user, key, ms, now) {
    if (!user.items) user.items = {};
    user.items[key] = user.items[key] && user.items[key] > now
        ? user.items[key] + ms
        : now + ms;
}

function clearShopBuffsForVip(user) {
    if (!user.items) user.items = {};
    const keysToRemove = ["anti_roubo", "roubo_bonus_cash", "roubo_bonus_chance", "bet_bonus", "daily_double"];
    for (const k of keysToRemove) {
        if (k in user.items) delete user.items[k];
    }
    user.dailyDoubleDays = 0;
}

export default {
    name: "comprar",
    aliases: ["buy"],
    description: "Compra um item da loja 🛒",
    category: "fun",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        const id = parseInt(args[0]);
        if (!id) return sock.sendMessage(from, { text: "❌ Use: *comprar <id>*" }, { quoted: msg });

        const items = getShopItems();
        const item = items.find(i => i.id === id);
        if (!item) return sock.sendMessage(from, { text: "❌ Item inválido." }, { quoted: msg });

        const db = readJSON(DB_LUCKY) || {};
        if (!db[from]) db[from] = {};
        if (!db[from][sender]) db[from][sender] = { money: 0, items: {}, inventory: {} };

        const user = db[from][sender];
        if (user.money < item.price) {
            return sock.sendMessage(from, { text: `❌ Você precisa de *${item.price} fyne coins* para comprar este item.` }, { quoted: msg });
        }

        user.money -= item.price;
        const now = Date.now();

        // Lógica por tipo de item
        if (item.type === "pet_use") {
            // Itens de inventário (Pet RPG)
            if (!user.inventory) user.inventory = {};
            user.inventory[item.key] = (user.inventory[item.key] || 0) + 1;
        } else if (item.key === "vip_profile") {
            clearShopBuffsForVip(user);
            const ms = durationToMs(item.duration || "15 dias");
            applyTimedItem(user, item.key, ms, now);
        } else if (item.duration) {
            const ms = durationToMs(item.duration);
            applyTimedItem(user, item.key, ms, now);
        }

        // Casos especiais legados
        if (item.key === "daily_double") user.dailyDoubleDays = (user.dailyDoubleDays || 0) + 7;
        
        initializeAttributes(from, sender);
        if (item.key === "msg_bonus") addMessages(from, sender, 100);
        if (item.key === "popularity") addPopularity(from, sender, 1);

        writeJSON(DB_LUCKY, db);

        let bonusText = "";
        if (item.type === "pet_use") bonusText = `\n📦 Item adicionado à sua mochila! Use !mochila para ver.`;
        else if (item.key === "vip_profile") bonusText = `\n👑 Perfil VIP ativado! Buffs antigos limpos.`;
        else if (item.duration) bonusText = `\n⏱️ Item ativado por ${item.duration}!`;

        await sock.sendMessage(from, {
            text: `🛒 *Compra realizada!*\n\n🏷️ Item: *${item.name}*\n💰 Valor: *${item.price} cash*${bonusText}`
        }, { quoted: msg });
    }
}
