import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: 'roletaban',
    description: 'Roleta: o bot tenta acertar um membro aleatório do grupo',
    category: "admin",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from.endsWith('@g.us')) return

        const botConfig = getBotConfig()

        let groupMetadata
        try {
            groupMetadata = await sock.groupMetadata(from)
        } catch {
            return sock.sendMessage(from, { text: "❌ Não consegui acessar os participantes do grupo." }, { quoted: msg })
        }

        // Exclui o bot, o criador e superadmins do sorteio
        const members = groupMetadata.participants.filter(p => {
            if (p.id === sock.user.id) return false                    // bot
            if (p.id === botConfig.botCreator) return false             // criador
            if (p.admin === "superadmin") return false                  // superadmin (dono do grupo)
            return true
        })

        if (members.length === 0) {
            return sock.sendMessage(from, { text: "❌ Nenhum membro elegível para o sorteio." }, { quoted: msg })
        }

        const randomIndex = Math.floor(Math.random() * members.length)
        const target = members[randomIndex]
        const targetId = target.id

        const shot = Math.floor(Math.random() * 6) + 1

        if (shot === 1) {
            const { getProtectedBy } = await import("../../utils/protect.js")
            const protectedBy = getProtectedBy(from, targetId)
            if (protectedBy) {
                return sock.sendMessage(from, {
                    text: `💥 O tiro acertou @${targetId.split('@')[0]} mas ele está protegido por @${protectedBy.split('@')[0]}! 🛡️`,
                    mentions: [targetId, protectedBy]
                }, { quoted: msg })
            }

            // Manda a mensagem com @menção real
            await sock.sendMessage(from, {
                text: `💥 *@${targetId.split('@')[0]} foi atingido!* 💀`,
                mentions: [targetId]
            }, { quoted: msg })

            try {
                await sock.groupParticipantsUpdate(from, [targetId], "remove")
            } catch {
                await sock.sendMessage(from, {
                    text: `❌ Não consegui remover @${targetId.split('@')[0]}. Talvez eu não seja admin.`,
                    mentions: [targetId]
                }, { quoted: msg })
            }
        } else {
            await sock.sendMessage(from, { text: `😅 Ninguém foi atingido desta vez! (${shot}/6)` }, { quoted: msg })
        }
    }
}
