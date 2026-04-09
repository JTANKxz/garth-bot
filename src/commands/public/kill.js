import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
    name: "kill",
    aliases: [],
    description: "Mata alguém no grupo com animação de GIF/MP4",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from.endsWith('@g.us')) return

        const sender = msg.key.participant || from
        const senderName = msg.pushName || sender.split('@')[0]
        const botNumber = sock.user.id

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } })

        try {
            const metadata = await sock.groupMetadata(from)
            const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

            let target
            if (mentionedJid) {
                if (mentionedJid === sender) {
                    await sock.sendMessage(from, {
                        text: "🩸 Você não pode se matar, vá procurar ajuda psicológica 🧠"
                    }, { quoted: msg })
                    await sock.sendMessage(from, { react: { text: "❌", key: msg.key } })
                    return
                }
                target = mentionedJid
            } else {
                const participants = metadata.participants
                    .map(p => p.id)
                    .filter(id => id !== sender && id !== botNumber)
                if (!participants.length) {
                    await sock.sendMessage(from, {
                        text: "❌ Não há ninguém disponível para matar 😶"
                    }, { quoted: msg })
                    await sock.sendMessage(from, { react: { text: "❌", key: msg.key } })
                    return
                }
                target = participants[Math.floor(Math.random() * participants.length)]
            }

            const victimName = target.split('@')[0]
            const gifs = ['kill1.mp4','kill2.mp4','kill3.mp4','kill4.mp4']
            const randomGif = gifs[Math.floor(Math.random() * gifs.length)]
            const gifPath = path.join(__dirname, '../../../assets/gifs/', randomGif)
            const buffer = fs.readFileSync(gifPath)

            await sock.sendMessage(from, {
                video: buffer,
                gifPlayback: true,
                caption: `💀 *${senderName}* matou brutalmente @${victimName}`,
                mentions: [sender, target]
            }, { quoted: msg })

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } })

        } catch (err) {
            console.error("Erro no comando kill:", err)
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } })
            await sock.sendMessage(from, {
                text: "❌ Ocorreu um erro ao executar o comando."
            }, { quoted: msg })
        }
    }
}
