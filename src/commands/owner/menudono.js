import { commands } from "../../handler/commandsHandler.js"
import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
  name: "menudono",
  aliases: ["helpowner"],
  description: "Mostra comandos exclusivos do dono do grupo",
  category: "owner",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    
    if (!from.endsWith("@g.us")) return

    const groupMetadata = await sock.groupMetadata(from)
    const isSuperAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin === "superadmin"

    if (!isSuperAdmin) {
      return sock.sendMessage(from, { text: "❌ Apenas o *Dono do Grupo* pode usar este menu!" }, { quoted: msg })
    }

    const groupConfig = getGroupConfig(from)
    const prefix = groupConfig?.prefix || "!"
    const botConfig = getBotConfig()

    const ownerCmds = []
    for (const [, cmd] of commands) {
      if (cmd.category === "owner" && cmd.showInMenu !== false) {
          ownerCmds.push(`> *${prefix}${cmd.name}*`)
      }
    }

    let text = `👑 *MENU DO DONO DO GRUPO*\n` +
      `══════════════════\n` +
      (ownerCmds.length ? ownerCmds.sort().join("\n") : "_Nenhum comando encontrado._") +
      `\n══════════════════\n` +
      `> 🤖 *${botConfig.botName}*`

    await sock.sendMessage(from, { text: text.trim() }, { quoted: msg })
  },
}
