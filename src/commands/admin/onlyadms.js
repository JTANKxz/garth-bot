import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "admins",
    aliases: ["priv"],
    description: "Configura o modo OnlyAdmins no grupo.",
    usage: "(on/off)",
    category: "admin",
    
    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const gConfig = getGroupConfig(jid)
        const prefix = gConfig.prefix
        
        this.aliases
        this.name

        const input = args[0]?.toLowerCase()
        if (!input || !["on", "off"].includes(input)) {
            return sock.sendMessage(jid, {
                text: `❌ Use: ${prefix}${this.name}/${this.aliases[0]} on | off`
            }, { quoted: msg })
        }

        const newState = input === "on"

        updateGroupConfig(jid, { onlyAdmins: newState })

        return sock.sendMessage(jid, {
            text: `✅ OnlyAdmins agora está \`${newState ? "ativado" : "desativado"}\` para este grupo.`
        }, { quoted: msg })
    }
}
