import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "cleanmute",
    aliases: ["desmutartodos", "unmuteall"],
    description: "Remove o mute de todos os usuários do grupo",
    category: "admin",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid
        if (!jid.endsWith("@g.us")) return

        const gConfig = getGroupConfig(jid)
        const muteds = gConfig.muteds || {}

        const users = Object.keys(muteds)

        if (!users.length) {
            return sock.sendMessage(jid, {
                text: "🔊 Não há usuários mutados no momento."
            }, { quoted: msg })
        }

        updateGroupConfig(jid, { muteds: {} })

        const text =
`╔═══✦ 🔊 *MUTES REMOVIDOS* ✦═══
║ 👥 *Total:* ${users.length}
║ 🛡️ *por:* @${msg.key.participant.split("@")[0]}
╚══════════════════`

        return sock.sendMessage(jid, {
            text,
            mentions: users.concat(msg.key.participant)
        }, { quoted: msg })
    }
}
