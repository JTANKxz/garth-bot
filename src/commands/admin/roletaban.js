
export default {
    name: 'roletaban',
    description: 'Roleta: o bot tenta acertar um membro aleatório do grupo',
    category: "admin",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from.endsWith('@g.us')) return

        let groupMetadata
        try {
            groupMetadata = await sock.groupMetadata(from)
        } catch {
            return sock.sendMessage(from, { text: "❌ Não consegui acessar os participantes do grupo." }, { quoted: msg })
        }

        const members = groupMetadata.participants.filter(p => p.id !== sock.user.id)
        if (members.length === 0) return sock.sendMessage(from, { text: "❌ Nenhum membro para selecionar." }, { quoted: msg })

        const randomIndex = Math.floor(Math.random() * members.length)
        const target = members[randomIndex]
        const targetId = target.id
        const targetName = target.pushName || targetId.split('@')[0]

        const shot = Math.floor(Math.random() * 6) + 1

        if (shot === 1) {
            
            await sock.sendMessage(from, { text: `💥 ${targetName} foi atingido! 💀` }, { quoted: msg })

            try {
                await sock.groupParticipantsUpdate(from, [targetId], "remove")
            } catch {
                await sock.sendMessage(from, { text: `❌ Não consegui remover ${targetName}. Talvez eu não seja admin.` }, { quoted: msg })
            }
        } else {
            
            await sock.sendMessage(from, { text: `😅 Ninguém foi atingido!` }, { quoted: msg })
        }
    }
}
