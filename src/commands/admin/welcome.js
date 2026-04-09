import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "welcome",
    description: "Configura o sistema de boas-vindas do grupo.",
    aliases: ["welcomemsg", "setwelcome", "bv"],
    usage: "(on/off/set/get)",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const groupConfig = getGroupConfig(jid)
        const prefix = groupConfig.prefix || "!"

        if (!args[0]) {
            return sock.sendMessage(jid, {
                text:
`⚙️ *Configuração do Welcome*

• *${prefix}welcome on* — ativa
• *${prefix}welcome off* — desativa
• *${prefix}welcome set Bem vindo ao grupo, {user}!*
• *${prefix}welcome get* — mostra mensagem atual

Exemplo de mensagem com menção:
"Bem vindo ao grupo, {user}!"

Mensagem atual:
"${groupConfig.welcomeMessage}"
Status: ${groupConfig.welcomeGroup ? "🟢 ativo" : "🔴 desligado"}`
            }, { quoted: msg })
        }

        const option = args[0].toLowerCase()

        if (option === "on") {
            groupConfig.welcomeGroup = true
            updateGroupConfig(jid, groupConfig)
            return sock.sendMessage(jid, { text: "🟢 *Sistema de boas-vindas ativado!*" }, { quoted: msg })
        }

        if (option === "off") {
            groupConfig.welcomeGroup = false
            updateGroupConfig(jid, groupConfig)
            return sock.sendMessage(jid, { text: "🔴 *Sistema de boas-vindas desativado.*" }, { quoted: msg })
        }

        if (option === "set") {
            const newMessage = args.slice(1).join(" ")
            if (!newMessage) {
                return sock.sendMessage(jid, { text: "❌ Use: *welcome set Sua mensagem aqui*" }, { quoted: msg })
            }
            groupConfig.welcomeMessage = newMessage
            updateGroupConfig(jid, groupConfig)
            return sock.sendMessage(jid, { 
                text: `✅ Mensagem de boas-vindas atualizada para:\n\n"${newMessage}"`
            }, { quoted: msg })
        }

        if (option === "get") {
            return sock.sendMessage(jid, { 
                text:
`📨 *Mensagem atual de boas-vindas:*
"${groupConfig.welcomeMessage}"

Status: ${groupConfig.welcomeGroup ? "🟢 ativo" : "🔴 desligado"}`
            }, { quoted: msg })
        }

        return sock.sendMessage(jid, { 
            text: "❌ Comando inválido.\nUse *welcome*, *welcome on*, *welcome off*, *welcome set <msg>* ou *welcome get*." 
        }, { quoted: msg })
    }
}
