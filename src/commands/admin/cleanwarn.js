import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

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

        updateGroupConfig(jid, { warnings: {} })

        const text =
`╔═══✦ 🧹 *ADVs LIMPAS* ✦═══
║ 👥 *Usuers afetados:* ${users.length}
║ 🛡️ *por:* @${msg.key.participant.split("@")[0]}
╚═══════════════════`

        await sock.sendMessage(jid, {
            text,
            mentions: [msg.key.participant]
        }, { quoted: msg })
    }
}
