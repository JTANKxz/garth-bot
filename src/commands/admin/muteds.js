import { getGroupConfig } from "../../utils/groups.js"

export default {
    name: "muteds",
    aliases: ["mutados", "silenciados"],
    description: "Lista todos os usuários mutados no grupo",
    category: "admin",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid
        if (!jid.endsWith("@g.us")) return

        const gConfig = getGroupConfig(jid)
        const muteds = gConfig.muteds || {}

        const now = Date.now()
        const list = []

        for (const [jidUser, data] of Object.entries(muteds)) {
            let timeLeft = "Indefinido"

            if (data.expiresAt) {
                const diffMs = data.expiresAt - now

                if (diffMs <= 0) {
                    timeLeft = "Expirado"
                } else {
                    const minutes = Math.ceil(diffMs / 60000)
                    timeLeft = `${minutes} min`
                }
            }

            list.push(
                `║ 👤 @${jidUser.split("@")[0]}\n` +
                `║ ⏱️ *Tempo restante:* ${timeLeft}\n` +
                `║ 🗑️ *Deletes:* ${data.deletes || 0}\n`
            )
        }

        if (!list.length) {
            return sock.sendMessage(jid, {
                text: "🔊 Não há usuários mutados no momento."
            }, { quoted: msg })
        }

        const text =
`╔═══✦ 🤐 *MUTADOS* ✦═══
║
${list.join("║────────────────────\n")}
╚══════════════════`

        return sock.sendMessage(jid, {
            text,
            mentions: Object.keys(muteds)
        }, { quoted: msg })
    }
}
