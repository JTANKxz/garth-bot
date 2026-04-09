//src/features/warning.js

//by Guto & João
import { getGroupConfig, updateGroupConfig } from '../utils/groups.js'

/**
 * Aplica uma advertência a um usuário, envia a mensagem e bane se atingir o limite
 * 
 * @param {object} sock - instância do Baileys
 * @param {string} groupId - ID do grupo
 * @param {string} userJid - JID do usuário a ser advertido
 * @param {string} senderJid - JID de quem aplicou a advertência
 * @param {string} reason - Motivo da advertência
 * @param {number} limit - Número máximo de advertências antes do ban (default: 3)
 */
export async function applyWarning(
  sock,
  groupId,
  userJid,
  senderJid,
  reason = 'Sem motivo especificado',
  limit = 3
) {
  const groupConfig = getGroupConfig(groupId)

  // Garante que existam as estruturas
  if (!groupConfig.warnings) groupConfig.warnings = {}
  if (!groupConfig.warnings[userJid]) groupConfig.warnings[userJid] = 0

  // Incrementa a advertência
  groupConfig.warnings[userJid] += 1

  // Atualiza warnings
  updateGroupConfig(groupId, { warnings: groupConfig.warnings })

  const totalWarnings = groupConfig.warnings[userJid]

  // Mensagem de advertência
  const warnMsg =
`╔═══ ✦ *⚠️ ADVERTÊNCIA* ✦═══
║ 👤 Usuário: @${userJid.split('@')[0]}
║ 🛡️ Por: @${senderJid.split('@')[0]}
║ 📝 Motivo: ${reason}
║ ⚠️ Advertências: ${totalWarnings}/${limit}
╚═════════════════════`

  await sock.sendMessage(groupId, {
    text: warnMsg,
    mentions: [userJid, senderJid]
  })

  // Se atingir o limite, banir automaticamente
  if (totalWarnings >= limit) {
    try {
      await sock.groupParticipantsUpdate(groupId, [userJid], 'remove')

      const banMsg =
`╔═══ ✦ *🚫 BANIDO* ✦═══
║ 👤 Usuário: @${userJid.split('@')[0]}
║ Motivo: Atingiu ${limit} advertências
╚═════════════════════`

      await sock.sendMessage(groupId, {
        text: banMsg,
        mentions: [userJid]
      })

      // Remove completamente o usuário do objeto warnings
      delete groupConfig.warnings[userJid]
      updateGroupConfig(groupId, { warnings: groupConfig.warnings })
    } catch (err) {
      console.error('Erro ao banir usuário automaticamente:', err)
    }
  }

  return totalWarnings
}
