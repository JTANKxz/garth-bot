
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "perm",
    description: "Define um usuário como allowedUser no grupo",
    usage: "@usuário ou respondendo a mensagem",
    aliases: ["allowuser", "setallowed"],
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
                text: `❌ Use: ${prefix}setallowed @usuário ou respondendo à mensagem de um usuário.`,
            }, { quoted: msg })
        }

        if (!groupConfig.allowedUsers) groupConfig.allowedUsers = []

        if (groupConfig.allowedUsers.includes(targetId)) {
            return sock.sendMessage(jid, {
                text: `✅ Usuário já tem permissão pra usar o bot.`,
            }, { quoted: msg })
        }

        groupConfig.allowedUsers.push(targetId)
        updateGroupConfig(jid, { allowedUsers: groupConfig.allowedUsers })

        await sock.sendMessage(jid, {
            text: `✅ Usuário @${targetId.split("@")[0]} agora tem permissão pra usar o bot!`,
            mentions: [targetId]
        }, { quoted: msg })
    }
}
