import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"
import { applyWarning } from "../../features/warning.js" 

export default {
    name: "warn",
    aliases: ["adv"],
    description: "Aplica uma advertência a um usuário.",
    usage: "(@user)",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const sender = msg.key.participant
        const groupConfig = getGroupConfig(jid)
        const botConfig = getBotConfig()
        const prefix = groupConfig.prefix || "!"

        let target
        let reason = args.join(" ") || "Sem motivo especificado"

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
        } else {
            
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}warn @user motivo ou responda uma mensagem.`,
                }, { quoted: msg })
            }
            target = mentions[0]
        }

        const isCreator = target === botConfig.botCreator
        const isMaster = target === botConfig.botMaster
        const isOwner = groupConfig.botOwners?.includes(target)
        if (isCreator || isMaster || isOwner) {
            return sock.sendMessage(jid, {
                text: `❌ Você não pode advertir o ${isCreator ? "criador" : isMaster ? "master" : "dono do bot"}!`
            }, { quoted: msg })
        }

        try {
            await applyWarning(sock, jid, target, sender, reason)
        } catch (err) {
            console.error("Erro ao aplicar warn:", err)
            await sock.sendMessage(jid, { text: "❌ Erro ao aplicar a advertência." }, { quoted: msg })
        }
    }
}
