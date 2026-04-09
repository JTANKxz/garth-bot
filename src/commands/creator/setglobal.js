import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { getBotConfig } from "../../config/botConfig.js";

const GLOBAL_SETTINGS_DB = "database/globalSettings.json";
const SHOP_DB = "database/shop.json";

export default {
    name: "setglobal",
    aliases: ["configglobal"],
    description: "Altera configurações globais da economia ou lista de itens (Apenas Criador)",
    category: "creator",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const botConfig = getBotConfig();

        if (sender !== botConfig.botCreator) {
            return sock.sendMessage(from, { text: "❌ Apenas o Criador pode usar este comando." }, { quoted: msg });
        }

        const type = args[0]?.toLowerCase(); // "economy" ou "price"
        const key = args[1];
        const value = args[2];

        if (!type || !key || !value) {
            return sock.sendMessage(from, { 
                text: `⚙️ *PAINEL GLOBAL*\n\n` +
                      `👉 *Economia:* !setglobal economy [chave] [valor]\n` +
                      `Ex: !setglobal economy win_rate_base 40\n\n` +
                      `👉 *Loja:* !setglobal price [item_key] [valor]\n` +
                      `Ex: !setglobal price anti_roubo 1200\n\n` +
                      `*Chaves disponíveis:* win_rate_base, daily_base, lottery_ticket_price, etc.`
            }, { quoted: msg });
        }

        if (type === "economy") {
            const settings = readJSON(GLOBAL_SETTINGS_DB) || {};
            const numValue = parseFloat(value);
            
            settings[key] = isNaN(numValue) ? value : numValue;
            writeJSON(GLOBAL_SETTINGS_DB, settings);
            
            await sock.sendMessage(from, { text: `✅ Configuração global *${key}* atualizada para *${value}*.` }, { quoted: msg });
        } 
        else if (type === "price") {
            const items = readJSON(SHOP_DB) || [];
            const item = items.find(i => i.key === key);
            
            if (!item) return sock.sendMessage(from, { text: `❌ Item *${key}* não encontrado na loja.` }, { quoted: msg });
            
            item.price = parseInt(value);
            writeJSON(SHOP_DB, items);
            
            await sock.sendMessage(from, { text: `✅ Preço do item *${item.name}* atualizado para *${value} fyne coins*.` }, { quoted: msg });
        }
    }
};
