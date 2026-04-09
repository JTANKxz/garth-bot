
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "noperm",
    description: "Remove um usuário da lista de allowedUsers no grupo",
    usage: "@usuário ou respondendo à mensagem",
    aliases: ["disallowuser", "delallow", "unallow", "unperm"],
    category: "owner",

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
                text: `❌ Use: ${prefix}removeallowed @usuário ou respondendo à mensagem de um usuário.`,
            }, { quoted: msg })
        }

        if (!groupConfig.allowedUsers) groupConfig.allowedUsers = []

        if (!groupConfig.allowedUsers.includes(targetId)) {
            return sock.sendMessage(jid, {
                text: `❌ Usuário não tem permissão para usar o bot.`,
            }, { quoted: msg })
        }

        groupConfig.allowedUsers = groupConfig.allowedUsers.filter(id => id !== targetId)
        updateGroupConfig(jid, { allowedUsers: groupConfig.allowedUsers })

        await sock.sendMessage(jid, {
            text: `✅ Usuário @${targetId.split("@")[0]} foi removido da lista de permissão do bot!`,
            mentions: [targetId]
        }, { quoted: msg })
    }
}
