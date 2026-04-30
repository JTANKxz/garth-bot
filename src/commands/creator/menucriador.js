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
      `\n══════════════════\n\n`

    // Chaves configuráveis do grupo
    text += `⚙️ *CHAVES CONFIGURÁVEIS*\n` +
      `══════════════════\n` +
      `📋 *Config do Grupo:*\n` +
      `> *prefix* — Prefixo do bot (ex: !, /)\n` +
      `> *welcomeMessage* — Mensagem de boas-vindas\n` +
      `> *onlyAdmins* — Só admins usam (true/false)\n` +
      `> *welcomeGroup* — Boas-vindas ativas (true/false)\n` +
      `> *leaveGroupMessage* — Msg de saída (true/false)\n` +
      `> *antilink* — Anti-link (true/false)\n` +
      `> *antifig* — Anti-figurinha (true/false)\n` +
      `> *auto* — Auto-resposta (true/false)\n` +
      `> *autoLearn* — Auto-aprendizado (true/false)\n` +
      `> *ai* — IA ativada (true/false)\n\n` +
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
      `📌 *Uso:*\n` +
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
