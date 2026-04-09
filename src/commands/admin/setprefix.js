import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "setprefix",
    aliases: ["prefix"],
    description: "Altera o prefixo do grupo",
    usage: "[novo prefixo]",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const gpConfig = getGroupConfig(jid)   
        const prefix = gpConfig.prefix         

        if (!args[0] || args[0].length > 3) {
            return sock.sendMessage(jid, {
                text: `❌ Use: ${prefix}setprefix [novo prefixo] (máx 3 caracteres)`
            }, { quoted: msg })
        }

        const newPrefix = args[0]

        const gConfig = getGroupConfig(jid)

        updateGroupConfig(jid, { prefix: newPrefix })

        return sock.sendMessage(jid, {
            text: `✅ Prefixo do grupo alterado para: \`${newPrefix}\``
        }, { quoted: msg })
    }
}
