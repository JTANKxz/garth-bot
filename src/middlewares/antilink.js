// src/middlewares/antilink.js
import { getGroupConfig, updateGroupConfig } from "../utils/groups.js"
import { applyWarning } from "../features/warning.js"

const linkRegex = /\b(?:https?:\/\/|www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})*(?:\/\S*)?\b/i

export async function antiLinkMiddleware(msg, sock, getCachedGroupMetadata) {
    try {
        const jid = msg.key.remoteJid
        const sender = msg.key.participant || jid

        // Apenas grupos
        if (!jid.endsWith("@g.us")) return false

        const groupConfig = getGroupConfig(jid)
        if (!groupConfig.antilink) return false // se anti-link desligado

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        if (!text) return false

        // Admins não recebem advertência
        const metadata = await getCachedGroupMetadata(sock, jid)
        const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
        if (admins.includes(sender)) return false

        // Verifica se contém link
        if (linkRegex.test(text)) {
            // Apaga a mensagem
            await sock.sendMessage(jid, { delete: msg.key })

            // Aplica advertência
            await applyWarning(sock, jid, sender, sock.user.id, "Mensagem com link não permitido")

            return true
        }

        return false
    } catch (err) {
        console.error("Erro no middleware antilink:", err)
        return false
    }
}
