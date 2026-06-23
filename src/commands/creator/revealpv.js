import { downloadMediaMessage, getContentType } from "baileys"

export default {
    name: "revelarpv",
    description: "Converte visualização única (viewOnce) em imagem ou vídeo normal e envia no privado",
    usage: "Responda a uma visualização única",
    aliases: ["rpv"],
    permission: "creator", 

    async run({ sock, msg, args }) {
        try {
            
            const senderJid = msg.key.participant || msg.key.remoteJid

            const context = msg.message.extendedTextMessage?.contextInfo
            const quoted = context?.quotedMessage
            if (!quoted) {
                return await sock.sendMessage(senderJid, {
                    text: "❌ Marque uma visualização única!",
                }, { quoted: msg })
            }

            const innerMsg = quoted.viewOnceMessage?.message || quoted
            const type = getContentType(innerMsg)

            if (!["imageMessage", "videoMessage", "audioMessage"].includes(type)) {
                return await sock.sendMessage(senderJid, {
                    text: "❌ Isso não é uma imagem, vídeo ou áudio de visualização única!",
                }, { quoted: msg })
            }

            const buffer = await downloadMediaMessage(
                { message: innerMsg },
                "buffer",
                {},
                { reuploadRequest: sock.updateMediaMessage }
            )

            if (type === "imageMessage") {
                await sock.sendMessage(senderJid, {
                    image: buffer,
                    caption: "✅ Visualização única convertida em imagem!"
                })
            } else if (type === "videoMessage") {
                await sock.sendMessage(senderJid, {
                    video: buffer,
                    caption: "✅ Visualização única convertida em vídeo!"
                })
            } else if (type === "audioMessage") {
                await sock.sendMessage(senderJid, {
                    audio: buffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                })
            }

        } catch (err) {
            console.error("Erro no comando revelarpv:", err)
            const senderJid = msg.key.participant || msg.key.remoteJid
            await sock.sendMessage(senderJid, {
                text: "❌ Erro ao converter visualização única!"
            })
        }
    }
}
