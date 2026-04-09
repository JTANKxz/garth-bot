import { simulateTyping } from "../../helpers/typing.js"
import { commands } from "../../handler/commandsHandler.js"
import { getGroupConfig, isGroupVip } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"
import moment from "moment-timezone"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  name: "menu",
  aliases: ["help", "comandos", "menu1"],
  description: "Mostra os comandos públicos disponíveis",
  category: "utils",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid
    await simulateTyping(sock, jid, 600)

    const groupConfig = getGroupConfig(jid)
    const prefix = groupConfig?.prefix || "!"

    let gName = "Grupo"
    if (jid.endsWith("@g.us")) {
      try {
        const meta = await sock.groupMetadata(jid)
        gName = meta.subject
      } catch {}
    }

    const botConfig = getBotConfig()
    const now = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss")
    const userName = msg.pushName || "Usuário"

    const categoryOrder = ["utils", "fun"]
    const categoryLabels = {
      utils: "UTILIDADES",
      fun: "BRINCADEIRAS",
    }

    const cats = { utils: [], fun: [] }

    for (const [, cmd] of commands) {
      if (!cmd?.name || cmd.showInMenu === false) continue
      if (categoryOrder.includes(cmd.category)) {
        cats[cmd.category].push(`> *${prefix}${cmd.name}*`)
      }
    }

    let text = `👋 Olá, *${userName}*!\n` +
      `══════════════════\n` +
      `> 🤖 *${botConfig.botName}*\n` +
      `> 🔧 *Prefixo:* ${prefix}\n` +
      `> 🕒 *${now}*\n` +
      `══════════════════\n`

    for (const cat of categoryOrder) {
      if (cats[cat].length) {
        text += `\n══〔 ${categoryLabels[cat]} 〕══\n${cats[cat].sort().join("\n")}\n`
      }
    }

    text += `\n📌 *Outros Menus:* \n` +
      `> *${prefix}menuadm* - Admins do Grupo\n` +
      `> *${prefix}menudono* - Dono do Bot\n` +
      `> *${prefix}menucriador* - Criador do Bot\n\n` +
      `> 🤖 *Criador:* @${botConfig.botCreator.split("@")[0]}`

    const imagePath = path.join(__dirname, "../../../assets/images/cirilo.png")
    const payload = { caption: text.trim(), mentions: [botConfig.botCreator] }

    if (fs.existsSync(imagePath)) {
      payload.image = fs.readFileSync(imagePath)
      await sock.sendMessage(jid, payload, { quoted: msg })
    } else {
      await sock.sendMessage(jid, { text: text.trim(), mentions: [botConfig.botCreator] }, { quoted: msg })
    }
  },
}