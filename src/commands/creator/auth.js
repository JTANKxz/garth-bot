import { getBotConfig, updateBotConfig } from "../../config/botConfig.js"
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

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
            const daysStr = args[1]
            if (!daysStr || isNaN(daysStr)) {
                return sock.sendMessage(jid, {
                    text: `❌ Uso correto: ${botConfig.prefix || "!"}auth add <dias>`
                }, { quoted: msg })
            }

            const days = parseInt(daysStr, 10)
            if (days <= 0) {
                return sock.sendMessage(jid, {
                    text: `❌ A quantidade de dias deve ser maior que zero.`
                }, { quoted: msg })
            }

            if (!botConfig.allowedGroups.includes(jid)) {
                botConfig.allowedGroups.push(jid)
                updateBotConfig(botConfig)
            }

            const groupConfig = getGroupConfig(jid)
            const durationMs = days * 24 * 60 * 60 * 1000

            let newExpiration
            if (groupConfig.authExpiresAt && groupConfig.authExpiresAt > Date.now()) {
                newExpiration = groupConfig.authExpiresAt + durationMs
            } else {
                newExpiration = Date.now() + durationMs
            }

            updateGroupConfig(jid, { authExpiresAt: newExpiration })

            return sock.sendMessage(jid, {
                text: `✅ Grupo autorizado por mais ${days} dia(s) com sucesso!`
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

            updateGroupConfig(jid, { authExpiresAt: null })

            return sock.sendMessage(jid, {
                text: `❌ Grupo removido da autorização!\nID do grupo: ${jid}`
            }, { quoted: msg })
        }
    }
}
