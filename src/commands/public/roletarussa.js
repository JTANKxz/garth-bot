function cleanJid(jidStr) {
  if (!jidStr) return ""

  const [user, host] = String(jidStr).split('@')
  const cleanUser = user.split(':')[0]
  return `${cleanUser}@${host || 's.whatsapp.net'}`
}

export default {
    name: 'roletarussa',
    description: 'Roleta russa: se morrer, é removido do grupo',
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from?.endsWith('@g.us')) return

        const sender = msg.key.participant || from
        const targetJid = cleanJid(sender)
        const pushName = msg.pushName || "Usuário"

        let groupMetadata
        try {
            groupMetadata = await sock.groupMetadata(from)
        } catch (e) {
            console.error('Erro ao buscar metadata do grupo:', e)
            return sock.sendMessage(from, { text: '❌ Não consegui acessar os dados do grupo.' }, { quoted: msg })
        }

        const botEntry = groupMetadata.participants.find(p => cleanJid(p.id) === cleanJid(sock.user?.id))
        if (!botEntry?.admin) {
            return sock.sendMessage(from, { text: '❌ Eu preciso ser admin para remover membros do grupo.' }, { quoted: msg })
        }

        const targetFromGroup = groupMetadata.participants.find(p => cleanJid(p.id) === targetJid)
        const finalTargetJid = targetFromGroup?.id || targetJid

        const resultado = Math.floor(Math.random() * 6) + 1

        if (resultado === 1) {
            await sock.sendMessage(from, { text: `💥 *${pushName} puxou o gatilho... e morreu!* 💀` }, { quoted: msg })

            try {
                await sock.groupParticipantsUpdate(from, [finalTargetJid], 'remove')
            } catch (e) {
                console.error('Erro ao remover participante na roleta russa:', e)
                await sock.sendMessage(from, { text: `❌ Não consegui remover ${pushName}. Talvez eu não tenha permissão para expulsar membros.` }, { quoted: msg })
            }
        } else {
            await sock.sendMessage(from, { text: `*${pushName} puxou o gatilho... e sobreviveu!*` }, { quoted: msg })
        }
    }
}
