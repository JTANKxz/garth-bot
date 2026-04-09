import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
    name: "ban",
    aliases: ["b", "remove"],
    usage: "(@user motivo)",
    description: "Remove um usuário.",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const gConfig = getGroupConfig(jid)
        const prefix = gConfig.prefix || "!"
        const sender = msg.key.participant
        const botConfig = getBotConfig()

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        let target
        let reason

        if (quoted) {
            target = context.participant
            reason = args.join(" ") || "Sem motivo especificado"
        } else {
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}ban @user motivo ou responda uma mensagem.`
                }, { quoted: msg })
            }
            target = mentions[0]
            reason = args.slice(1).join(" ") || "Sem motivo especificado"
        }

        const isCreator = target === botConfig.botCreator
        const isMaster = target === botConfig.botMaster
        const isOwner = gConfig.botOwners?.includes(target)

        if (isCreator || isMaster) {

            if (sender === botConfig.botCreator || sender === botConfig.botMaster) {
                return sock.sendMessage(jid, {
                    text: "🤨 Ué, isso não faz sentido."
                }, { quoted: msg })
            }

            try {
                
                await sock.groupParticipantsUpdate(jid, [sender], "remove")

                const txt =
`KKKKK louco e sonhador`

                return sock.sendMessage(jid, {
                    text: txt,
                    mentions: [sender]
                }, { quoted: msg })

            } catch (e) {
                console.error("Erro no ban reverso:", e)
                return sock.sendMessage(jid, {
                    text: "❌ Erro ao aplicar o ban reverso."
                }, { quoted: msg })
            }
        }

        if (isOwner) {
            return sock.sendMessage(jid, {
                text: "❌ Você não pode banir um dono do bot."
            }, { quoted: msg })
        }

        try {
            await sock.groupParticipantsUpdate(jid, [target], "remove")

            const txt =
`╔═══✦ 🚫 *BANIDO* ✦═══
║ 👤 *Banido:* @${target.split("@")[0]}
║ 🛡️ *Por:* @${sender.split("@")[0]}
║ 📝 *Motivo:* ${reason}
╚═════════════════════`

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } })

            return sock.sendMessage(jid, {
                text: txt,
                mentions: [target, sender]
            }, { quoted: msg })

        } catch (e) {
            console.error("Erro ao banir:", e)
            return sock.sendMessage(jid, {
                text: "❌ Erro ao tentar banir o usuário."
            }, { quoted: msg })
        }
    }
}
