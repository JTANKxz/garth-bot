
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
    name: "autolearn",
    description: "Ativa ou desativa o aprendizado automático de respostas do bot no grupo",
    usage: "autolearn on | autolearn off",
    aliases: ["autolearning", "auto-aprendizado"],
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
            return sock.sendMessage(jid, { text: "❌ Use: autolearn on | autolearn off" }, { quoted: msg })
        }

        const status = args[0].toLowerCase() === "on"
        groupConfig.autoLearn = status
        updateGroupConfig(jid, { autoLearn: status })

        await sock.sendMessage(jid, {
            text: `✅ Auto aprendizado de respostas do bot foi *${status ? "ativado" : "desativado"}* neste grupo.`,
        }, { quoted: msg })
    }
}
