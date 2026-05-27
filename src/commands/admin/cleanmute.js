import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

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

        const botConfig = getBotConfig()
        const sender = msg.key.participant || msg.key.remoteJid
        const isCreator = sender === botConfig.botCreator

        let finalMuteds = { ...muteds }
        let removedCount = 0
        const usersToUnmute = []

        for (const u of users) {
            const info = muteds[u]
            if (info?.by === botConfig.botCreator && !isCreator) {
                continue
            }
            delete finalMuteds[u]
            usersToUnmute.push(u)
            removedCount++
        }

        if (removedCount === 0) {
            return sock.sendMessage(jid, {
                text: "❌ Não há usuários mutados que você possa desmutar (os atuais foram mutados pelo criador)."
            }, { quoted: msg })
        }

        updateGroupConfig(jid, { muteds: finalMuteds })

        const text =
`╔═══✦ 🔊 *MUTES REMOVIDOS* ✦═══
║ 👥 *Total:* ${removedCount}
║ 🛡️ *por:* @${sender.split("@")[0]}
╚══════════════════`

        return sock.sendMessage(jid, {
            text,
            mentions: usersToUnmute.concat(sender)
        }, { quoted: msg })
    }
}
