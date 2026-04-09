import { GLOBALS } from "../../utils/globals.js"
import { downloadContentFromMessage } from "baileys"

async function getBuffer(msg, type) {
    const stream = await downloadContentFromMessage(msg, type)
    let buffer = Buffer.from([])

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}

export default {
    name: "citar",
    category: "admin",
    aliases: ["tagall", "marcar", "totag"],
    description: "Menciona todos do grupo",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const metadata = await sock.groupMetadata(jid)
        const participants = metadata.participants.map(p => p.id)

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {

            if (quoted.conversation) {
                return sock.sendMessage(jid, {
                    text: quoted.conversation,
                    mentions: participants
                })
            }

            if (quoted.imageMessage) {
                const buffer = await getBuffer(quoted.imageMessage, 'image')
                return sock.sendMessage(jid, {
                    image: buffer,
                    caption: args.join(" ") || "",
                    mentions: participants
                })
            }

            if (quoted.videoMessage) {
                const buffer = await getBuffer(quoted.videoMessage, 'video')
                return sock.sendMessage(jid, {
                    video: buffer,
                    caption: args.join(" ") || "",
                    mentions: participants
                })
            }

            if (quoted.stickerMessage) {
                const buffer = await getBuffer(quoted.stickerMessage, 'sticker')
                return sock.sendMessage(jid, {
                    sticker: buffer,
                    mentions: participants
                })
            }

            if (quoted.audioMessage) {
                const buffer = await getBuffer(quoted.audioMessage, 'audio')
                return sock.sendMessage(jid, {
                    audio: buffer,
                    mimetype: "audio/mpeg",
                    ptt: quoted.audioMessage.ptt || false,
                    mentions: participants
                })
            }

            return sock.sendMessage(jid, {
                text: "📨 Este tipo de mídia não é suportado ainda.",
                mentions: participants
            })
        }

        if (args.length > 0) {
            return sock.sendMessage(jid, {
                text: args.join(" "),
                mentions: participants
            })
        }

        return sock.sendMessage(jid, {
            text: `❌ Use: ${GLOBALS.PREFIX}citar [mensagem] ou responda uma mídia/texto.`,
        }, { quoted: msg })
    }
}
