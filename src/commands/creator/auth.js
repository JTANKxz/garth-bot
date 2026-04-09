
import { getBotConfig, updateBotConfig } from "../../config/botConfig.js"

export default {
    name: "auth",
    description: "Gerencia grupos autorizados para usar o bot",
    usage: "(add|rm)",
    aliases: ["authorize", "permit"],
    permission: "creator", 

    async run({ sock, msg, args }) {
        const botConfig = getBotConfig()
        const jid = msg.key.remoteJid

        const action = args[0]?.toLowerCase()
        if (!action || !["add", "rm"].includes(action)) {
            return sock.sendMessage(jid, {
                text: `❌ Uso correto: ${botConfig.prefix || "!"}auth add | rm`
            }, { quoted: msg })
        }

        if (action === "add") {
            if (botConfig.allowedGroups.includes(jid)) {
                return sock.sendMessage(jid, {
                    text: "✅ Este grupo já está autorizado."
                }, { quoted: msg })
            }

            botConfig.allowedGroups.push(jid)
            updateBotConfig(botConfig)

            return sock.sendMessage(jid, {
                text: `✅ Grupo autorizado com sucesso!`
            }, { quoted: msg })
        }

        if (action === "rm") {
            if (!botConfig.allowedGroups.includes(jid)) {
                return sock.sendMessage(jid, {
                    text: "❌ Este grupo não estava autorizado."
                }, { quoted: msg })
            }

            botConfig.allowedGroups = botConfig.allowedGroups.filter(g => g !== jid)
            updateBotConfig(botConfig)

            return sock.sendMessage(jid, {
                text: `❌ Grupo removido da autorização!\nID do grupo: ${jid}`
            }, { quoted: msg })
        }
    }
}
