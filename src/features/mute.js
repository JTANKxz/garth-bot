// src/features/mute.js
import { getGroupConfig, updateGroupConfig } from "../utils/groups.js"
import { applyWarning } from "./warning.js"

/**
 * Mutar um usuário
 */
export function muteUser(groupId, userJid) {
    const groupConfig = getGroupConfig(groupId)

    if (!groupConfig.muteds) groupConfig.muteds = {}
    if (!groupConfig.muteds[userJid])
        groupConfig.muteds[userJid] = { muted: true, deletes: 0 }
    else
        groupConfig.muteds[userJid].muted = true

    updateGroupConfig(groupId, { muteds: groupConfig.muteds })
}

/**
 * Desmutar usuário
 */
export function unmuteUser(groupId, userJid) {
    const groupConfig = getGroupConfig(groupId)

    if (!groupConfig.muteds) groupConfig.muteds = {}

    delete groupConfig.muteds[userJid]

    updateGroupConfig(groupId, { muteds: groupConfig.muteds })
}

/**
 * Verifica se o usuário está mutado
 */
export function isMuted(groupId, userJid) {
    const groupConfig = getGroupConfig(groupId)
    if (!groupConfig.muteds) return false
    return groupConfig.muteds[userJid]?.muted || false
}

/**
 * Registra uma mensagem apagada
 * Após 5 deletes -> advertência automática
 */
export async function registerMutedDelete(sock, groupId, userJid) {
    const groupConfig = getGroupConfig(groupId)

    if (!groupConfig.muteds[userJid])
        groupConfig.muteds[userJid] = { muted: true, deletes: 0 }

    groupConfig.muteds[userJid].deletes++

    updateGroupConfig(groupId, { muteds: groupConfig.muteds })
    
    if (groupConfig.muteds[userJid].deletes >= 5) {
        await applyWarning(
            sock,
            groupId,
            userJid,
            sock.user.id, // BOT APLICA ADV
            "Mensagem enviada enquanto estava mutado"
        )

        // zera contagem
        groupConfig.muteds[userJid].deletes = 0
        updateGroupConfig(groupId, { muteds: groupConfig.muteds })
    }
}
