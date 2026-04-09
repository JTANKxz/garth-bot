import { getGroupConfig } from "../../utils/groups.js"

export default {
    name: "rebaixar",
    aliases: ["demote", "noadm"],
    description: "Rebaixa um usuário de admin para membro do grupo.",
    usage: "(@user)",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const sender = msg.key.participant
        const gConfig = getGroupConfig(jid)   
        const prefix = gConfig.prefix         

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        let target

        if (quoted) {
            target = context.participant
        } else {
            
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}rebaixar @user ou responda uma mensagem.`
                }, { quoted: msg })
            }
            target = mentions[0]
        }

        try {
            const group = await sock.groupMetadata(jid)
            const targetParticipant = group.participants.find(p => p.id === target)

            if (!targetParticipant) {
                return sock.sendMessage(jid, {
                    text: `❌ Usuário não encontrado no grupo.`,
                    mentions: [target]
                }, { quoted: msg })
            }

            if (!targetParticipant.admin) {
                return sock.sendMessage(jid, {
                    text: `ℹ️ @${target.split("@")[0]} não era e nem vai ser adm KKKK 😂🫵.`,
                    mentions: [target]
                }, { quoted: msg })
            }

            await sock.groupParticipantsUpdate(jid, [target], "demote")

            return sock.sendMessage(jid, {
                text: `✅ @${target.split("@")[0]} foi rebaixado a membro.`,
                mentions: [target]
            }, { quoted: msg })

        } catch (e) {
            console.error("Erro ao rebaixar:", e)
            return sock.sendMessage(jid, {
                text: "❌ Não foi possível rebaixar o usuário."
            }, { quoted: msg })
        }
    }
}
