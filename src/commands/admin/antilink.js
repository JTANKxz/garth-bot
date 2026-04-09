
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export default {
    name: "antilink",
    description: "Ativa ou desativa o sistema de Anti-Link no grupo",
    usage: "(on/off)",
    aliases: ["nolink", "blocklink"],
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const groupConfig = getGroupConfig(jid)
        const option = args[0]?.toLowerCase()

        if (!option || !["on", "off"].includes(option)) {
            return sock.sendMessage(jid, {
                text: `❌ Use: ${groupConfig.prefix || "!"}antilink on | off`,
            }, { quoted: msg })
        }

        const enabled = option === "on"
        updateGroupConfig(jid, { antilink: enabled })

        await sock.sendMessage(jid, {
            text: `⚠️ Anti-Link ${enabled ? "ativado ✅" : "desativado ❌"}!`,
        }, { quoted: msg })
    }
}
