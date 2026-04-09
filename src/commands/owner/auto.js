
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
    name: "auto",
    description: "Ativa ou desativa as auto respostas do bot no grupo",
    usage: "auto on | auto off",
    aliases: ["autobot", "auto-resposta"],
    category: "owner",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        
        const sender = msg.key.participant || jid
        const botConfig = getBotConfig()
        const groupConfig = getGroupConfig(jid)

        const isCreator = sender === botConfig.botCreator
        const isOwner = (groupConfig.botOwners || []).includes(sender)

        if (!isCreator && !isOwner) {
            return sock.sendMessage(jid, { text: "❌ Apenas bot owners ou o criador podem usar este comando." }, { quoted: msg })
        }

        if (!args[0] || !["on", "off"].includes(args[0].toLowerCase())) {
            return sock.sendMessage(jid, { text: "❌ Use: auto on | auto off" }, { quoted: msg })
        }

        const status = args[0].toLowerCase() === "on"
        groupConfig.auto = status
        updateGroupConfig(jid, { auto: status })

        await sock.sendMessage(jid, {
            text: `✅ Auto respostas do bot foram *${status ? "ativadas" : "desativadas"}* neste grupo.`,
        }, { quoted: msg })
    }
}
