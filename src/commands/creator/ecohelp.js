import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
  name: "ecohelp",
  aliases: ["ajudaeconomia", "chaves"],
  description: "Mostra as chaves de configuração de economia do bot",
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

    let text = `⚙️ *GUIA DE CHAVES (CRIADOR)*\n` +
      `══════════════════\n\n` +
      `💰 *Economia do Grupo (economy.):*\n` +
      `> *win_rate_base* — Taxa de vitória base (%)\n` +
      `> *win_rate_vip* — Taxa de vitória VIP (%)\n` +
      `> *daily_base* — Valor base do daily\n` +
      `> *rob_chance_base* — Chance de roubo (%)\n` +
      `> *lottery_ticket_price* — Preço do bilhete\n` +
      `> *salary_multiplier* — Multiplicador de salário\n\n` +
      `🏪 *Preços da Loja (por grupo):*\n` +
      `> *anti_roubo* — Proteção anti-roubo\n` +
      `> *vip_profile* — Perfil VIP\n` +
      `> *pet_food_pro* — Ração Premium\n` +
      `> _(e outros itens do shop.json)_\n\n` +
      `══════════════════\n` +
      `📌 *Uso dos Comandos:*\n` +
      `> *${prefix}setgroup [chave] [valor]*\n` +
      `> _(aplica no grupo atual)_\n\n` +
      `> *${prefix}setgroup [ID] [chave] [valor]*\n` +
      `> _(aplica em outro grupo)_\n\n` +
      `> *${prefix}setglobal economy [chave] [valor]*\n` +
      `> *${prefix}setglobal price [item] [valor]*\n` +
      `══════════════════\n` +
      `> 🤖 *${botConfig.botName}*`

    await sock.sendMessage(from, { text: text.trim() }, { quoted: msg })
  },
}
