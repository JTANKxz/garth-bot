import { startMarriage, handleMarriageResponse, loadDatabase } from '../../features/marriage.js'

export default {
    name: 'casar',
    description: 'Pede alguém em casamento',
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from.endsWith('@g.us')) return

        let mentioned = []
        if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid) {
            mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid
        } else if (msg.message.imageMessage?.contextInfo?.mentionedJid) {
            mentioned = msg.message.imageMessage.contextInfo.mentionedJid
        } else if (msg.message.videoMessage?.contextInfo?.mentionedJid) {
            mentioned = msg.message.videoMessage.contextInfo.mentionedJid
        }

        if (!mentioned.length) {
            await sock.sendMessage(from, { text: '❌ Você precisa mencionar alguém para casar!' }, { quoted: msg })
            return
        }

        const target = mentioned[0]
        const sender = msg.key.participant || from
        const db = loadDatabase()
        const groupDb = db[from] || {} 

        const casadoSender = Object.values(groupDb).find(c => c.requester === sender || c.target === sender)
        if (casadoSender) {
            const par = casadoSender.requester === sender ? casadoSender.target : casadoSender.requester
            await sock.sendMessage(from, {
                text: `😂 Eita! Você já é casado com @${par.split('@')[0]}! Não pode pedir outro casamento.`,
                mentions: [par]
            }, { quoted: msg })
            return
        }

        const casadoTarget = Object.values(groupDb).find(c => c.requester === target || c.target === target)
        if (casadoTarget) {
            const par = casadoTarget.requester === target ? casadoTarget.target : casadoTarget.requester
            await sock.sendMessage(from, {
                text: `😲 Ops! @${target.split('@')[0]} já está casado com @${par.split('@')[0]}! Escolha outro alvo.`,
                mentions: [target, par]
            }, { quoted: msg })
            return
        }

        await startMarriage({ sock, msg, target })
    },

    handleResponse: handleMarriageResponse
}
