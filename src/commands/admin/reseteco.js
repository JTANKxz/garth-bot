import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js";

export default {
    name: "reseteco",
    aliases: ["resetareconomia"],
    description: "Reseta a economia e preços do grupo atual de volta aos padrões globais (Apenas Admin)",
    category: "admin",
    
    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        try {
            const metadata = await sock.groupMetadata(from);
            const part = metadata.participants.find(p => p.id === sender);
            
            if (!part || (part.admin !== "admin" && part.admin !== "superadmin")) {
                return sock.sendMessage(from, { text: "❌ Apenas admins podem usar este comando." }, { quoted: msg });
            }

            // Reseta a economia personalizada do grupo (volta a usar as globais)
            updateGroupConfig(from, { 
                economy: {}, 
                shopOverrides: {} 
            });

            await sock.sendMessage(from, { 
                text: "✅ *Economia Resetada!*\n\nTodas as taxas de ganhos, vitórias, e preços de loja do grupo foram restaurados para os padrões globais do bot." 
            }, { quoted: msg });

        } catch (err) {
            console.error("Erro no comando reseteco:", err);
            await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao resetar a economia." }, { quoted: msg });
        }
    }
};
