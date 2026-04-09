import { loadDatabase, saveDatabase } from '../../features/marriage.js'

export default {
    name: 'divorciar',
    description: 'Desfaz o casamento do usuário no grupo',
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from.endsWith('@g.us')) return

        const sender = msg.key.participant || from
        const db = loadDatabase()
        const groupDb = db[from] || {}

        const casamentoKey = Object.keys(groupDb).find(
            k => groupDb[k].requester === sender || groupDb[k].target === sender
        )

        if (!casamentoKey) {
            await sock.sendMessage(from, {
                text: '❌ Você não está casado com ninguém neste grupo.'
            }, { quoted: msg })
            return
        }

        const casamento = groupDb[casamentoKey]
        const par = casamento.requester === sender ? casamento.target : casamento.requester

        delete groupDb[casamentoKey]
        db[from] = groupDb
        saveDatabase(db)

        await sock.sendMessage(from, {
            text: `💔 @${sender.split('@')[0]} e @${par.split('@')[0]} agora estão divorciados!`,
            mentions: [sender, par]
        }, { quoted: msg })
    }
}
