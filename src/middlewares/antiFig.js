// src/middlewares/antifig.js
import { getGroupConfig, updateGroupConfig } from '../utils/groups.js'
import { isSticker } from '../utils/messageType.js'
import { applyWarning } from '../features/warning.js'

export async function antiFigMiddleware(msg, sock) {
    const jid = msg.key.remoteJid

    // Só grupos
    if (!jid?.endsWith('@g.us')) return false

    const groupConfig = getGroupConfig(jid)

    // Se antifig desligado, sai
    if (!groupConfig.antifig) return false

    // Se não for figurinha, sai
    if (!isSticker(msg.message)) return false

    try {
        const meta = await sock.groupMetadata(jid)
        const participant = meta.participants.find(p => p.id === msg.key.participant)

        // Se for admin → não apagar
        if (participant?.admin) return false

        // Apaga figurinha
        await sock.sendMessage(jid, { delete: msg.key })

        // =============== CONTAGEM DE FIG DELETADAS ===============

        if (!groupConfig.antifigCount) groupConfig.antifigCount = {}
        const user = msg.key.participant

        if (!groupConfig.antifigCount[user]) groupConfig.antifigCount[user] = 0

        groupConfig.antifigCount[user] += 1

        // salva nova contagem
        updateGroupConfig(jid, { antifigCount: groupConfig.antifigCount })

        // Se atingiu 3 → aplica advertência automaticamente
        if (groupConfig.antifigCount[user] >= 3) {
            await applyWarning(
                sock,
                jid,
                user,
                sock.user.id, // BOT COMO AUTOR
                'Envio de figurinhas no grupo com antifig ativado',
            )


            // zera contador após advertência
            groupConfig.antifigCount[user] = 0
            updateGroupConfig(jid, { antifigCount: groupConfig.antifigCount })
        }

        return true
    } catch (err) {
        console.error('Erro no antifig:', err)
        return false
    }
}
