import { ACHIEVEMENTS } from "../../features/achievements/achievements.js";
import { getUserProgress } from "../../features/progress/progressStore.js";

export default {
    name: "conquistas",
    aliases: ["achievements", "trofeus", "badges"],
    description: "Mostra as conquistas desbloqueadas",
    category: "fun",
    usage: "[@user]",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        let targetId = sender;
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            targetId = msg.message.extendedTextMessage.contextInfo.participant;
        }

        const pushName = targetId === sender ? (msg.pushName || "Usuário") : `@${targetId.split("@")[0]}`;

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const progress = getUserProgress(jid, targetId);
            const userAchievements = progress.achievements || [];

            // Pega todas as conquistas catalogadas
            const allAchievements = [];
            for (const key in ACHIEVEMENTS) {
                allAchievements.push(...ACHIEVEMENTS[key]);
            }

            const total = allAchievements.length;
            const unlockedCount = userAchievements.length;
            
            let text = `🏆 *CONQUISTAS DE ${pushName.toUpperCase()}* 🏆\n`;
            text += `> 📊 *Progresso:* ${unlockedCount} / ${total} desbloqueadas\n\n`;

            if (unlockedCount === 0) {
                text += `> ❌ Nenhuma conquista desbloqueada ainda.\n`;
                text += `> Continue interagindo e usando comandos para ganhar!`;
            } else {
                text += `*🏅 Conquistas Obtidas:*\n`;
                for (const ach of allAchievements) {
                    if (userAchievements.includes(ach.id)) {
                        text += `> ✅ *${ach.name}*\n`;
                    }
                }
                
                if (unlockedCount < total) {
                    text += `\n*🔒 Faltam Desbloquear (Top 10):*\n`;
                    let lockedCount = 0;
                    for (const ach of allAchievements) {
                        if (!userAchievements.includes(ach.id)) {
                            text += `> ❌ *${ach.name}* - ${ach.text}\n`;
                            lockedCount++;
                            if (lockedCount >= 10) {
                                const restantes = total - unlockedCount - 10;
                                if (restantes > 0) {
                                    text += `> _... e mais ${restantes} conquistas ocultas_\n`;
                                }
                                break;
                            }
                        }
                    }
                }
            }

            await sock.sendMessage(
                jid, 
                { text: text, mentions: [targetId] }, 
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando conquistas:", err);
            await sock.sendMessage(jid, { text: "❌ Ocorreu um erro ao carregar as conquistas." }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};
