import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
    name: "resetadv",
    aliases: ["cw", "resetwarn", "unwarnall"],
    description: "Remove todas as advertências do grupo",
    category: "admin",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid
        if (!jid.endsWith("@g.us")) return

        const gConfig = getGroupConfig(jid)
        const warnings = gConfig.warnings || {}
        const users = Object.keys(warnings)

        if (!users.length) {
            return sock.sendMessage(jid, {
                text: "✅ Não há advertências para limpar neste grupo."
            }, { quoted: msg })
        }

        const botConfig = getBotConfig()
        const sender = msg.key.participant || msg.key.remoteJid
        const isCreator = sender === botConfig.botCreator

        let finalWarnings = { ...warnings }
        let finalWarnedByCreator = { ...(gConfig.warnedByCreator || {}) }
        let removedCount = 0
        const usersCleared = []

        for (const u of users) {
            if (gConfig.warnedByCreator?.[u] === true && !isCreator) {
                continue
            }
            delete finalWarnings[u]
            delete finalWarnedByCreator[u]
            usersCleared.push(u)
            removedCount++
        }

        if (removedCount === 0) {
            return sock.sendMessage(jid, {
                text: "❌ Não há advertências que você possa limpar (as atuais foram aplicadas pelo criador do bot)."
            }, { quoted: msg })
        }

        updateGroupConfig(jid, { 
            warnings: finalWarnings,
            warnedByCreator: finalWarnedByCreator
        })

        const text =
`╔═══✦ 🧹 *ADVs LIMPAS* ✦═══
║ 👥 *Users limpos:* ${removedCount}
║ 🛡️ *por:* @${sender.split("@")[0]}
╚═══════════════════`

        await sock.sendMessage(jid, {
            text,
            mentions: usersCleared.concat(sender)
        }, { quoted: msg })
    }
}
