import { getShopItems } from "../../utils/economyManager.js";

export default {
    name: "loja",
    aliases: ["shop", "store"],
    description: "Mostra os itens disponíveis na loja 🏪",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const items = getShopItems(from);

        if (items.length === 0) {
            return sock.sendMessage(from, { text: "🏪 *LOJA VAZIA*\n\nNenhum item disponível no momento." }, { quoted: msg });
        }

        let text = "🏪 *LOJA DO BOT*\n\n";
        let lastCategory = null;

        for (const item of items) {
            if (item.category !== lastCategory) {
                text += `━━━━━━━━━━━━━━━━━━\n`;
                text += `${item.category}\n`;
                text += `━━━━━━━━━━━━━━━━━━\n`;
                lastCategory = item.category;
            }

            text += `\n*${item.id}.* *${item.name}*\n`;
            text += `${item.description}\n`;
            if (item.duration) {
                text += `⏱️ Duração: *${item.duration}*\n`;
            }
            text += `💰 Preço: *${item.price} fyne coins*\n`;
        }

        text += `\n━━━━━━━━━━━━━━━━━━\n`;
        text += `🛒 Use: *comprar <id>*\nEx: *comprar 1*\n💳 Aceitamos fyne coins como pagamento!`;

        await sock.sendMessage(from, { text }, { quoted: msg });
    }
}
