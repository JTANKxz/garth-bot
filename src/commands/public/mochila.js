import { readJSON } from "../../utils/readJSON.js";

const DB_LUCKY = "database/lucky.json";

export default {
    name: "mochila",
    aliases: ["inventario", "bag", "items"],
    description: "Mostra os itens que você possui",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        const db = readJSON(DB_LUCKY) || {};
        const user = db[from]?.[sender];

        if (!user || !user.inventory || Object.keys(user.inventory).length === 0) {
            return sock.sendMessage(from, { text: "🎒 *SUA MOCHILA ESTÁ VAZIA*\n\nEnvie seu pet para explorar com !explorar para encontrar itens!" }, { quoted: msg });
        }

        const itemDescriptions = {
            pet_food_pro: "🍖 *Ração Premium*: `!usar racao`",
            pet_toy: "🎾 *Brinquedo*: `!usar brinquedo`",
            luck_charm: "🍀 *Amuleto*: `!usar amuleto`",
        };

        const lines = Object.entries(user.inventory).map(([key, count]) => {
            const desc = itemDescriptions[key] || `📦 *${key.replace(/_/g, " ")}*`;
            return `${desc}\n    └─ Quantidade: *${count}*`;
        });

        const text = `🎒 *SUA MOCHILA RPG*\n` +
            `══════════════════\n` +
            lines.join("\n\n") +
            `\n══════════════════\n` +
            `👉 Use: *!usar [nome do item]* para consumir.`;

        await sock.sendMessage(from, { text }, { quoted: msg });
    }
};
