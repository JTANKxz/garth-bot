import { resetAllGroupsEconomy } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: "resetglobaleco",
    aliases: ["resetalleco", "resetareconomiaglobal"],
    description: "Reseta TODAS as taxas e preços de TODOS os grupos (Apenas Criador)",
    category: "creator",
    
    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const botConfig = getBotConfig();
        
        if (sender !== botConfig.botCreator) {
            return sock.sendMessage(from, { text: "❌ Apenas o Criador do bot pode usar este comando." }, { quoted: msg });
        }

        try {
            await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

            const resetCount = resetAllGroupsEconomy();

            await sock.sendMessage(from, { 
                text: `✅ *Economia Global Resetada!*\n\nForam apagadas as configurações customizadas de economia e loja de *${resetCount}* grupos.\nAgora todos os grupos voltaram a usar as taxas e preços originais do bot.` 
            }, { quoted: msg });
            
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando resetglobaleco:", err);
            await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao resetar a economia global." }, { quoted: msg });
        }
    }
};
