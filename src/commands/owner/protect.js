import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"
import { protectUser, unprotectUser, getProtectedBy } from "../../utils/protect.js"

export default {
    name: "protect",
    description: "Protege um usuário contra mute, warn e ban pelo bot (ou desprotege se já estiver protegido).",
    aliases: ["proteger", "unprotect"],
    usage: "(@user)",
    category: "owner",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        if (!jid.endsWith("@g.us")) return

        const sender = msg.key.participant || msg.key.remoteJid
        const botConfig = getBotConfig()
        const gConfig = getGroupConfig(jid)

        // Apenas o dono do bot / superuser pode usar (permission check also handled by command handler, but good to ensure)
        const isSuperUser = sender === botConfig.botCreator || sender === botConfig.botMaster
        const isBotOwner = (gConfig.botOwners || []).includes(sender)

        if (!isSuperUser && !isBotOwner) {
            return sock.sendMessage(jid, { text: "❌ Apenas o dono do bot pode usar este comando." }, { quoted: msg })
        }

        let target
        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
        } else if (context?.mentionedJid?.length) {
            target = context.mentionedJid[0]
        } else {
            const prefix = gConfig.prefix || "!"
            return sock.sendMessage(jid, {
                text: `❌ Marque ou responda o usuário que deseja proteger/desproteger.\nExemplo: ${prefix}protect @user`
            }, { quoted: msg })
        }

        const isProtected = getProtectedBy(jid, target)

        if (isProtected) {
            unprotectUser(jid, target)
            await sock.sendMessage(jid, {
                text: `✅ O usuário @${target.split("@")[0]} não está mais protegido contra ameaças.`,
                mentions: [target]
            }, { quoted: msg })
        } else {
            protectUser(jid, target, sender)
            await sock.sendMessage(jid, {
                text: `Usuario @${target.split("@")[0]} agora está protegido contra ameça`,
                mentions: [target]
            }, { quoted: msg })
        }
    }
}
