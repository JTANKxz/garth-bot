import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
    name: "kick",
    aliases: ["k"],
    description: "Remove e adiciona à blacklist.",
    usage: "(@user motivo)",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const gConfig = getGroupConfig(jid)
        const prefix = gConfig.prefix || "!"
        const botConfig = getBotConfig()
        const sender = msg.key.participant

        let target
        let reason

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
            reason = args.join(" ") || "Sem motivo especificado"
        } else {
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}kick @user motivo ou responda a mensagem do usuário.`
                }, { quoted: msg })
            }
            target = mentions[0]
            reason = args.slice(1).join(" ") || "Sem motivo especificado"
        }

        const isCreator = target === botConfig.botCreator
        const isMaster = target === botConfig.botMaster
        const isOwner = gConfig.botOwners?.includes(target)
        if (isCreator || isMaster || isOwner) {
            return sock.sendMessage(jid, {
                text: `❌ Você não pode remover o ${isCreator ? "criador" : isMaster ? "master" : "dono do bot"}!`
            }, { quoted: msg })
        }

        try {
            
            await sock.groupParticipantsUpdate(jid, [target], "remove")

            if (!gConfig.blacklisteds.includes(target)) {
                gConfig.blacklisteds.push(target)
                updateGroupConfig(jid, { blacklisteds: gConfig.blacklisteds })
            }

            const txt =
`╔═══✦ 🚫 *KICK* ✦═══
║ 👤 *Removido:* @${target.split("@")[0]}
║ 🛡️ *Por:* @${sender.split("@")[0]}
║ 📝 *Motivo:* ${reason}
║ ⚠️ *Adicionado à blacklist do grupo*
╚═════════════════════`

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } })
            return sock.sendMessage(jid, {
                text: txt,
                mentions: [target, sender]
            }, { quoted: msg })

        } catch (e) {
            console.error("Erro ao remover usuário:", e)
            return sock.sendMessage(jid, {
                text: "❌ Erro ao tentar remover o usuário."
            }, { quoted: msg })
        }
    }
}
