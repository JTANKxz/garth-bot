import { commands } from "../../handler/commandsHandler.js"
import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
  name: "menucriador",
  aliases: ["helpcreator", "criador"],
  description: "Mostra comandos exclusivos do criador do bot",
  category: "creator",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    
    const botConfig = getBotConfig()
    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(from, { text: "❌ Apenas o *Criador do Bot* pode usar este menu!" }, { quoted: msg })
    }

    const groupConfig = getGroupConfig(from)
    const prefix = groupConfig?.prefix || "!"

    const creatorCmds = []
    for (const [, cmd] of commands) {
      if (cmd.category === "creator" && cmd.showInMenu !== false) {
          creatorCmds.push(`> *${prefix}${cmd.name}*`)
      }
    }

    let text = `👨‍💻 *MENU DO CRIADOR*\n` +
      `══════════════════\n` +
      (creatorCmds.length ? creatorCmds.sort().join("\n") : "_Nenhum comando encontrado._") +
      `\n══════════════════\n` +
      `> 🤖 *${botConfig.botName}*`

    await sock.sendMessage(from, { text: text.trim() }, { quoted: msg })
  },
}
