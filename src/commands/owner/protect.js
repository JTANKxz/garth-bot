import { getGroupConfig } from "../../utils/groups.js"
import { protectUser, unprotectUser, getProtectedBy } from "../../utils/protect.js"

export default {
    name: "protect",
    description: "Protege um usuário contra mute, warn e ban pelo bot (ou desprotege se já estiver protegido).",
    usage: "@usuário ou respondendo a mensagem",
    aliases: ["proteger", "unprotect"],
    category: "owner",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        if (!jid.endsWith("@g.us")) return

        const sender = msg.key.participant || msg.key.remoteJid
        const groupConfig = getGroupConfig(jid)
        const prefix = groupConfig.prefix || "!"

        const context = msg.message?.extendedTextMessage?.contextInfo

        const mentionedId = context?.mentionedJid?.[0]

        let repliedId
        if (context?.quotedMessage) {
            repliedId = context.participant || context.quotedMessage?.key?.participant
        }

        const targetId = mentionedId || repliedId
        if (!targetId) {
            return sock.sendMessage(jid, {
                text: `❌ Use: ${prefix}protect @usuário ou respondendo à mensagem de um usuário.`,
            }, { quoted: msg })
        }

        const isProtected = getProtectedBy(jid, targetId)

        if (isProtected) {
            unprotectUser(jid, targetId)
            await sock.sendMessage(jid, {
                text: `✅ O usuário @${targetId.split("@")[0]} não está mais protegido contra ameaças.`,
                mentions: [targetId]
            }, { quoted: msg })
        } else {
            protectUser(jid, targetId, sender)
            await sock.sendMessage(jid, {
                text: `Usuario @${targetId.split("@")[0]} agora está protegido contra ameça`,
                mentions: [targetId]
            }, { quoted: msg })
        }
    }
}
