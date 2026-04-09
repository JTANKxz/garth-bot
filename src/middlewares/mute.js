import { isMuted, registerMutedDelete, unmuteUser } from "../features/mute.js"
import { getGroupConfig } from "../utils/groups.js"

// Cache apenas para mensagens de usuários mutados
const muteProcessed = new Set()

export async function muteMiddleware(msg, sock) {
    const jid = msg.key.remoteJid
    if (!jid?.endsWith("@g.us")) return false

    const sender = msg.key.participant
    if (!sender) return false

    const msgId = msg.key.id
    if (!isMuted(jid, sender)) {
        return false
    }

    // ✅ VERIFICAR EXPIRAÇÃO - Funciona mesmo após reinicialização
    const gConfig = getGroupConfig(jid)
    const muteData = gConfig.muteds?.[sender]
    
    if (muteData?.expiresAt && Date.now() >= muteData.expiresAt) {
        // Mute expirou - desmutar automaticamente
        unmuteUser(jid, sender)
        return false // deixa a mensagem passar normalmente
    }

    // A partir daqui o usuário está mutado 

    if (muteProcessed.has(msgId)) return true
    muteProcessed.add(msgId)

    setTimeout(() => muteProcessed.delete(msgId), 3000)

    // Deletar mensagem
    try {
        await sock.sendMessage(jid, {
            delete: msg.key
        })
    } catch (e) {
        console.error("Erro ao deletar mensagem mutada:", e)
    }

    // Registra delete
    await registerMutedDelete(sock, jid, sender)

    return true // bloqueia comandos e contadores
}
