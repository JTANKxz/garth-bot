import { getGroupConfig } from "../../utils/groups.js"

export default {
    name: "warnings",
    description: "Lista todos os usuários com advertências no grupo.",
    aliases: ["warns", "advlist"],
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const groupConfig = getGroupConfig(jid)
        const warnings = groupConfig.warnings || {}
        const entries = Object.entries(warnings)

        if (entries.length === 0) {
            return sock.sendMessage(jid, { text: "✅ Nenhum usuário possui advertências no grupo." }, { quoted: msg })
        }

        let text = '╔═══✦ *⚠️ ADVERTÊNCIAS* ✦═══\n'
        let i = 1
        const mentions = []

        for (const [userJid, count] of entries) {
            const alertEmoji = count >= 2 ? "⚠️" : "🔹"
            text += `║ ${i}. ${alertEmoji} @${userJid.split('@')[0]} - ${count} advertência(s)\n`
            mentions.push(userJid)
            i++
        }

        text += '╚═════════════════════\n'

        await sock.sendMessage(jid, {
            text,
            mentions
        })
    }
}
