import { getGroupConfig } from '../../utils/groups.js'
import { batataGames } from './batata.js'

export default {
  name: 'passar',
  aliases: [],
  description: 'Passa a batata quente para outro usuário',
  category: "utils",
  showInMenu: false,

  async run({ sock, msg }) {
    const groupJid = msg.key.remoteJid
    if (!groupJid.endsWith('@g.us')) return

    const groupConfig = getGroupConfig(groupJid)
    const prefix = groupConfig.prefix || '!'

    const sender = msg.key.participant || groupJid
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || []

    if (mentioned.length === 0) {
      return sock.sendMessage(
        groupJid,
        { text: `❌ Marque alguém para passar a batata! Ex: ${prefix}passar @usuário` },
        { quoted: msg }
      )
    }

    const newHolder = mentioned[0]
    const game = batataGames[groupJid]

    if (!game?.active) {
      return sock.sendMessage(
        groupJid,
        { text: "❌ Nenhum game de batata quente ativo neste grupo." },
        { quoted: msg }
      )
    }

    const secondsLeft = Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000))
    if (secondsLeft <= 0) {
      return sock.sendMessage(
        groupJid,
        { text: "⏱️ Tarde demais! O tempo já acabou." },
        { quoted: msg }
      )
    }

    if (game.holder !== sender) {
      return sock.sendMessage(
        groupJid,
        { text: "❌ Você não está com a batata!" },
        { quoted: msg }
      )
    }

    game.holder = newHolder

    // ✅ Só texto ao passar
    await sock.sendMessage(groupJid, {
      text:
        `🥔 Batata passada para @${newHolder.split('@')[0]}!\n` +
        `⏳ Faltam ${secondsLeft} segundos!`,
      mentions: [newHolder]
    }, { quoted: msg })
  }
}
