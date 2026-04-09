
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "unmute",
    description: "Desmuta um usuário.",
    aliases: ["desmutar", "desmute", "descalar"],
    usage: "(@user)",
    category: "admin",

    async run({ sock, msg, args }) {

        const jid = msg.key.remoteJid
        if (!jid.endsWith("@g.us")) return

        const sender = msg.key.participant

        const gConfig = getGroupConfig(jid)
        if (!gConfig.muteds) gConfig.muteds = {}

        const prefix = gConfig.prefix || "!"

        let target

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
        }

        else if (context?.mentionedJid?.length) {
            target = context.mentionedJid[0]
        }

        else {
            return sock.sendMessage(jid, {
                text: `❌ Use:\n ${prefix}unmute @user\n• Ou responda uma mensagem`
            }, { quoted: msg })
        }

        if (!gConfig.muteds[target]) {
            return sock.sendMessage(jid, {
                text: `⚠️ O usuário @${target.split('@')[0]} não está mutado.`,
                mentions: [target]
            }, { quoted: msg })
        }

        delete gConfig.muteds[target]
        updateGroupConfig(jid, { muteds: gConfig.muteds })

        const txt =
`╔═══✦ *🔊 DESMUTADO(A)* ✦═══
║ 👤 *Usuário:* @${target.split('@')[0]}
║ 🛡️ *Por:* @${sender.split('@')[0]}
╚═════════════════════`

        await sock.sendMessage(jid, {
            text: txt,
            mentions: [target, sender]
        }, { quoted: msg })
    }
}
