import { downloadMediaMessage, getContentType } from "baileys"

export default {
    name: "visu",
    description: "Converte visualização única (viewOnce) em imagem ou vídeo normal",
    usage: "Responda a uma visualização única",
    aliases: ["viewonce", "v1", "reveal", "revelar"],
    category: "owner",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        try {
            
            const context = msg.message.extendedTextMessage?.contextInfo
            const quoted = context?.quotedMessage
            if (!quoted) {
                return await sock.sendMessage(jid, {
                    text: "❌ Marque uma visualização única!",
                }, { quoted: msg })
            }

            const innerMsg = quoted.viewOnceMessage?.message || quoted
            const type = getContentType(innerMsg)

            if (!["imageMessage", "videoMessage"].includes(type)) {
                return await sock.sendMessage(jid, {
                    text: "❌ Isso não é uma imagem ou vídeo de visualização única!",
                }, { quoted: msg })
            }

            const buffer = await downloadMediaMessage(
                { message: innerMsg },
                "buffer",
                {},
                { reuploadRequest: sock.updateMediaMessage }
            )

            if (type === "imageMessage") {
                await sock.sendMessage(jid, {
                    image: buffer,
                    caption: "✅ Visualização única convertida em imagem!"
                }, { quoted: msg })
            } else if (type === "videoMessage") {
                await sock.sendMessage(jid, {
                    video: buffer,
                    caption: "✅ Visualização única convertida em vídeo!"
                }, { quoted: msg })
            }

        } catch (err) {
            console.error("Erro no comando visu:", err)
            await sock.sendMessage(jid, {
                text: "❌ Erro ao converter visualização única!",
            }, { quoted: msg })
        }
    }
}
