
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "setown",
    description: "Define um usuário como dono do bot no grupo",
    usage: "@usuário ou respondendo a mensagem",
    aliases: ["botowner", "setdono"],
    permission: "creator", 

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const groupConfig = getGroupConfig(jid)
        const prefix = groupConfig.prefix || "!"

        const context = msg.message.extendedTextMessage?.contextInfo

        const mentionedId = context?.mentionedJid?.[0]

        let repliedId
        if (context?.quotedMessage) {
            
            repliedId = context.participant || context.quotedMessage?.key?.participant
        }

        const targetId = mentionedId || repliedId
        if (!targetId) {
            return sock.sendMessage(jid, {
                text: `❌ Use: ${prefix}setown @usuário ou respondendo a mensagem de um usuário.`,
            }, { quoted: msg })
        }

        if (!groupConfig.botOwners) groupConfig.botOwners = []

        if (groupConfig.botOwners.includes(targetId)) {
            return sock.sendMessage(jid, {
                text: `✅ Usuário já é dono do bot neste grupo.`,
            }, { quoted: msg })
        }

        groupConfig.botOwners.push(targetId)
        updateGroupConfig(jid, { botOwners: groupConfig.botOwners })

        await sock.sendMessage(jid, {
            text: `✅ Usuário @${targetId.split("@")[0]} agora é dono do bot neste grupo!`,
            mentions: [targetId]
        }, { quoted: msg })
    }
}
