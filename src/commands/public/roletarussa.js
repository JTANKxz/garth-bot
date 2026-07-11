export default {
    name: 'roletarussa',
    description: 'Roleta russa: se morrer, é removido do grupo',
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from?.endsWith('@g.us')) return

        const sender = msg.key.participant || from
        const pushName = msg.pushName || "Usuário"

        let groupMetadata
        try {
            groupMetadata = await sock.groupMetadata(from)
        } catch (e) {
            console.error('Erro ao buscar metadata do grupo:', e)
            return sock.sendMessage(from, { text: '❌ Não consegui acessar os dados do grupo.' }, { quoted: msg })
        }

        const participants = groupMetadata.participants

        // Verifica se o bot é admin — comparação direta sem cleanJid (igual ao roletaban)
        const botEntry = participants.find(p => p.id === sock.user.id)
        if (!botEntry || (botEntry.admin !== 'admin' && botEntry.admin !== 'superadmin')) {
            return sock.sendMessage(from, { text: '❌ Eu preciso ser admin para remover membros do grupo.' }, { quoted: msg })
        }

        // Encontra o participante real pelo sender (já vem como @lid)
        const senderEntry = participants.find(p => p.id === sender)

        // Protege admins
        if (senderEntry?.admin === 'admin' || senderEntry?.admin === 'superadmin') {
            return sock.sendMessage(from, {
                text: `🛡️ *${pushName}*, administradores não podem jogar roleta russa!`
            }, { quoted: msg })
        }

        const resultado = Math.floor(Math.random() * 6) + 1

        if (resultado === 1) {
            await sock.sendMessage(from, { text: `💥 *${pushName} puxou o gatilho... e morreu!* 💀` }, { quoted: msg })

            try {
                // Usa o id original do participante para o remove
                const targetId = senderEntry?.id || sender
                await sock.groupParticipantsUpdate(from, [targetId], 'remove')
            } catch (e) {
                console.error('Erro ao remover participante na roleta russa:', e)
                await sock.sendMessage(from, {
                    text: `❌ Não consegui remover *${pushName}*. Verifique se o bot tem permissão de expulsar no grupo.`
                }, { quoted: msg })
            }
        } else {
            await sock.sendMessage(from, { text: `🍀 *${pushName} puxou o gatilho... e sobreviveu! (${resultado}/6)*` }, { quoted: msg })
        }
    }
}
