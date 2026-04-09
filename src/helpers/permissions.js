import { CONFIG } from '../config/index.js'

export function isOwner(jid) {
    return jid === CONFIG.ownerNumber || jid === CONFIG.ownerLid
}

export async function isAdmin(sock, msg) {
    try {
        const jid = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid

        const metadata = await sock.groupMetadata(jid)
        const admins = metadata.participants.filter(p => p.admin)

        return admins.map(a => a.id).includes(sender)
    } catch {
        return false
    }
}

export async function isCreator(jid) {
    // Se quiser usar para "nível intermediário"
    return jid === CONFIG.ownerNumber
}
