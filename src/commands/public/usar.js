import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { getPet } from "../../features/pet/service.js";

const DB_LUCKY = "database/lucky.json";
const DB_PETS = "database/pets.json";

export default {
    name: "usar",
    aliases: ["use", "consumir"],
    description: "Usa um item do seu inventário",
    category: "fun",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        const itemQuery = args.join("_").toLowerCase();
        if (!itemQuery) return sock.sendMessage(from, { text: "❌ Qual item você deseja usar? Ex: !usar racao" }, { quoted: msg });

        const luckyDB = readJSON(DB_LUCKY) || {};
        const user = luckyDB[from]?.[sender];

        if (!user || !user.inventory) {
            return sock.sendMessage(from, { text: "🎒 Sua mochila está vazia!" }, { quoted: msg });
        }

        // Mapeamento de nomes amigáveis para chaves internas
        const ITEM_MAP = {
            "brinquedo": "pet_toy",
            "toy": "pet_toy",
            "racao": "pet_food_pro",
            "premium": "pet_food_pro",
            "amuleto": "luck_charm",
            "sorte": "luck_charm",
            "charm": "luck_charm"
        };

        // 1. Tenta encontrar pelo De/Para (aliasing)
        let itemKey = ITEM_MAP[itemQuery];

        // 2. Se não encontrou, tenta busca aproximada nas chaves do inventário
        if (!itemKey) {
            itemKey = Object.keys(user.inventory).find(k => 
                k.toLowerCase().includes(itemQuery) || 
                itemQuery.includes(k.toLowerCase())
            );
        }

        if (!itemKey || !user.inventory[itemKey] || user.inventory[itemKey] <= 0) {
            return sock.sendMessage(from, { text: `❌ Você não possui o item "${itemQuery}" na sua mochila.` }, { quoted: msg });
        }

        const petsDB = readJSON(DB_PETS) || {};
        const pet = getPet(petsDB, from, sender);
        let successMsg = "";

        // Efeitos dos Itens
        if (itemKey === "pet_food_pro") {
            if (!pet) return sock.sendMessage(from, { text: "🐾 Você precisa de um pet para usar este item!" }, { quoted: msg });
            pet.stats.hunger = Math.min(100, pet.stats.hunger + 80);
            pet.stats.life = Math.min(100, pet.stats.life + 10);
            successMsg = `🍖 *${pet.name}* adorou a ração premium! Fome recuperada.`;
        } 
        else if (itemKey === "pet_toy") {
            if (!pet) return sock.sendMessage(from, { text: "🐾 Você precisa de um pet para usar este item!" }, { quoted: msg });
            pet.stats.affection = Math.min(100, pet.stats.affection + 50);
            successMsg = `🎾 Você brincou com *${pet.name}* e ele está muito feliz!`;
        }
        else if (itemKey === "luck_charm") {
            if (!user.items) user.items = {};
            const oneHour = 60 * 60 * 1000;
            const now = Date.now();
            user.items.luck_charm = (user.items.luck_charm && user.items.luck_charm > now)
                ? user.items.luck_charm + oneHour
                : now + oneHour;
            successMsg = `🍀 *AMULETO ATIVADO!*\nSuas chances em apostas aumentaram por 1 hora.`;
        } else {
            return sock.sendMessage(from, { text: "⚠️ Este item não tem um efeito de uso direto." }, { quoted: msg });
        }

        // Consome o item
        user.inventory[itemKey] -= 1;
        if (user.inventory[itemKey] === 0) delete user.inventory[itemKey];

        // Salva
        writeJSON(DB_LUCKY, luckyDB);
        writeJSON(DB_PETS, petsDB);

        await sock.sendMessage(from, { text: `🎒 *MOCHILA*\n\n✅ ${successMsg}` }, { quoted: msg });
    }
};
