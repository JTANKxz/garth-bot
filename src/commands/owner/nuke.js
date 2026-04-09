import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
    name: "nuke",
    description: "Expulsa todos os membros do grupo (menos donos, admins e o bot)",
    usage: "nuke",
    aliases: ["limpar-grupo", "ban-all"],
    category: "owner",
    showInMenu: false,

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid

        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(
                jid,
                { text: "❌ Este comando só pode ser usado em grupos." },
                { quoted: msg }
            )
        }

        const sender = msg.key.participant || jid
        const botConfig = getBotConfig()
        const groupConfig = getGroupConfig(jid)

        const isCreator = sender === botConfig.botCreator
        const isOwner = (groupConfig.botOwners || []).includes(sender)

        if (!isCreator && !isOwner) {
            return sock.sendMessage(
                jid,
                { text: "❌ Apenas bot owners ou o criador podem usar este comando." },
                { quoted: msg }
            )
        }

        try {
            const groupMetadata = await sock.groupMetadata(jid)
            const participants = groupMetadata.participants

            const botId = sock.user.id
            const botOwners = groupConfig.botOwners || []

            const targets = participants
                .filter(p => {
                    const id = p.id
                    const isAdmin = p.admin === "admin" || p.admin === "superadmin"
                    const isBot = id === botId
                    const isOwner = botOwners.includes(id)
                    return !isAdmin && !isBot && !isOwner
                })
                .map(p => p.id)

            if (targets.length === 0) {
                return sock.sendMessage(
                    jid,
                    { text: "⚠️ Não há ninguém para expulsar." },
                    { quoted: msg }
                )
            }

            const batchSize = 250
            for (let i = 0; i < targets.length; i += batchSize) {
                const batch = targets.slice(i, i + batchSize)
                await sock.groupParticipantsUpdate(jid, batch, "remove")
                await new Promise(res => setTimeout(res, 1500))
            }

            await sock.sendMessage(jid, {
                text: `💣 *NUKE EXECUTADO!*\n\nForam expulsos ${targets.length} membros do grupo.`,
            }, { quoted: msg })

        } catch (err) {
            console.error("Erro no nuke:", err)
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao executar o nuke." },
                { quoted: msg }
            )
        }
    }
}
