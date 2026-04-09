import { getGroupConfig } from '../../utils/groups.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const batataGames = {}

export default {
  name: 'batata',
  aliases: [],
  description: 'Inicia o game da batata quente',
  category: "fun",

  async run({ sock, msg }) {
    const groupJid = msg.key.remoteJid
    if (!groupJid.endsWith('@g.us')) return

    const groupConfig = getGroupConfig(groupJid)
    const prefix = groupConfig.prefix || '!'

    const sender = msg.key.participant || groupJid

    if (batataGames[groupJid]?.active) {
      return sock.sendMessage(
        groupJid,
        { text: "❌ Um game de batata quente já está ativo neste grupo." },
        { quoted: msg }
      )
    }

    const durationMs = 60_000 // 1 minuto fixo
    const now = Date.now()

    batataGames[groupJid] = {
      active: true,
      holder: sender,
      startedAt: now,
      endsAt: now + durationMs,
      timeout: null
    }

    await sock.sendMessage(groupJid, {
      text: `🥔 O game da batata quente começou!\n@${sender.split('@')[0]} está com a batata!\nUse ${prefix}passar @usuário`,
      mentions: [sender]
    }, { quoted: msg })

    startExplosionTimer(sock, groupJid, msg)
  }
}

function startExplosionTimer(sock, groupJid, quotedMsg) {
  const game = batataGames[groupJid]
  if (!game) return

  const msLeft = Math.max(0, game.endsAt - Date.now())

  game.timeout = setTimeout(async () => {
    const g = batataGames[groupJid]
    if (!g?.active) return

    const holder = g.holder
    if (!holder) return

    try {
      // 🔥 GIF / VÍDEO SÓ NA EXPLOSÃO
      const gifPath = path.join(__dirname, '../../../assets/gifs/batata.mp4')
      const buffer = fs.readFileSync(gifPath)

      await sock.sendMessage(groupJid, {
        video: buffer,
        gifPlayback: true,
        caption: `💥 BOOOOM! A batata explodiu na mão de @${holder.split('@')[0]}!`,
        mentions: [holder]
      }, { quoted: quotedMsg })

    } catch (err) {
      console.log('Erro ao enviar gif da batata:', err)

      // fallback texto
      await sock.sendMessage(groupJid, {
        text: `💥 Tempo esgotado! A batata explodiu na mão de @${holder.split('@')[0]}!`,
        mentions: [holder]
      }, { quoted: quotedMsg })
    }

    delete batataGames[groupJid]
  }, msLeft)
}

export { batataGames }
