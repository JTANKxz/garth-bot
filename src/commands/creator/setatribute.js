
import { messageCount, saveCounts, initializeAttributes } from "../../features/messageCounts.js"
import { getGroupConfig } from "../../utils/groups.js"

export default {
    name: 'add',
    description: 'Adiciona pontos a atributos de um usuário (somente admins ou você mesmo)',
    usage: '[atributo] @usuário [quantidade] ou [atributo] [quantidade]',
    aliases: [],
    permission: "creator", 

    async run({ sock, msg, args }) {
        const groupJid = msg.key.remoteJid
        const senderId = msg.key.participant || msg.key.remoteJid
        const groupConfig = getGroupConfig(groupJid)
        const prefix = groupConfig.prefix || "!"

        const mentionedId = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (args.length < 2) {
            return sock.sendMessage(groupJid, { 
                text: `❌ Use: ${prefix}${args[0]} [atributo] @usuário [quantidade] ou [atributo] [quantidade]`,
                quoted: msg 
            })
        }

        const atributoInput = args[0].toLowerCase()
        const valor = parseInt(mentionedId ? args[2] : args[1])
        if (isNaN(valor)) return sock.sendMessage(groupJid, { text: '❌ Valor inválido.', quoted: msg })

        const atributosValidos = ['força','forca','vida','proteção','protection','agilidade','popularity','popularidade']
        if (!atributosValidos.includes(atributoInput)) {
            return sock.sendMessage(groupJid, { text: `❌ Atributo inválido. Use: ${atributosValidos.join(', ')}`, quoted: msg })
        }

        const targetId = mentionedId || senderId

        initializeAttributes(groupJid, targetId)
        const userData = messageCount[groupJid][targetId]

        const atributoMap = {
            'força': 'forca',
            'forca': 'forca',
            'vida': 'life',
            'proteção': 'protection',
            'protection': 'protection',
            'agilidade': 'agility',
            'popularidade': 'popularity',
            'popularity': 'popularity'
        }
        const atributo = atributoMap[atributoInput]

        userData[atributo] = (userData[atributo] || 0) + valor
        saveCounts()

        await sock.sendMessage(groupJid, {
            text: `✅ O atributo *${atributo}* de @${targetId.split('@')[0]} foi aumentado em *${valor}*! Valor atual: *${userData[atributo]}*`,
            mentions: [targetId]
        }, { quoted: msg })
    }
}
