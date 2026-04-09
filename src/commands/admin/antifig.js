
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "antifig",
    description: "Deleta figurinhas",
    usage: "(on/off)",
    aliases: ["nofig", "blockfig"],
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const groupConfig = getGroupConfig(jid)
        const option = args[0]?.toLowerCase()

        if (!option || !["on", "off"].includes(option)) {
            return sock.sendMessage(jid, {
                text: `❌ Use: ${groupConfig.prefix || "!"}antifig on | off`,
            }, { quoted: msg })
        }

        const enabled = option === "on"
        updateGroupConfig(jid, { antifig: enabled })

        await sock.sendMessage(jid, {
            text: `⚠️ Anti-figurinha ${enabled ? "ativado ✅" : "desativado ❌"}!`,
        }, { quoted: msg })
    }
}
