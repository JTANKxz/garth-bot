export default {
    name: 'roletarussa',
    description: 'Roleta russa: se morrer, é removido do grupo',
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from.endsWith('@g.us')) return

        const sender = msg.key.participant || from
        const pushName = msg.pushName || "Usuário"

        const resultado = Math.floor(Math.random() * 6) + 1

        if (resultado === 1) {
            await sock.sendMessage(from, { text: `💥 *${pushName} puxou o gatilho... e morreu!* 💀` }, { quoted: msg })

            try {
                
                await sock.groupParticipantsUpdate(from, [sender], "remove")
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Não consegui remover ${pushName}. Talvez eu não seja admin.` }, { quoted: msg })
            }
        } else {
            await sock.sendMessage(from, { text: `*${pushName} puxou o gatilho... e sobreviveu!*` }, { quoted: msg })
        }
    }
}
