import { commands } from "../../handler/commandsHandler.js"
import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
  name: "menuadm",
  aliases: ["helpadmin", "adm"],
  description: "Mostra comandos administrativos",
  category: "admin",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    
    if (!from.endsWith("@g.us")) return

    const groupMetadata = await sock.groupMetadata(from)
    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin

    if (!isAdmin) {
      return sock.sendMessage(from, { text: "❌ Apenas administradores podem ver este menu!" }, { quoted: msg })
    }

    const groupConfig = getGroupConfig(from)
    const prefix = groupConfig?.prefix || "!"
    const botConfig = getBotConfig()

    const adminCmds = []
    for (const [, cmd] of commands) {
      if (cmd.category === "admin" && cmd.showInMenu !== false) {
          adminCmds.push(`> *${prefix}${cmd.name}*`)
      }
    }

    let text = `🛡️ *MENU ADMINISTRATIVO*\n` +
      `══════════════════\n` +
      adminCmds.sort().join("\n") +
      `\n══════════════════\n` +
      `> 🤖 *${botConfig.botName}*`

    await sock.sendMessage(from, { text: text.trim() }, { quoted: msg })
  },
}
