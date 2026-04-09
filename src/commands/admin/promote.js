import { getGroupConfig } from "../../utils/groups.js"

export default {
    name: "promover",
    aliases: ["promote", "setadmin"],
    description: "Promove um usuário a admin.",
    usage: "(@user)",
    category: "admin",

    permission: "admin", 
    
    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

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
                return sock.sendMessage(jid, { text: `❌ Use: ${prefix}promover @user ou responda a mensagem do usuário.` }, { quoted: msg })
            }
            target = mentions[0]
        }

        try {
            const metadata = await sock.groupMetadata(jid)
            const participant = metadata.participants.find(p => p.id === target)

            if (!participant) {
                return sock.sendMessage(jid, { text: "❌ Usuário não encontrado no grupo." }, { quoted: msg })
            }

            if (participant.admin) {
                return sock.sendMessage(jid, { text: `⚠️ @${target.split("@")[0]} já é admin.`, mentions: [target] }, { quoted: msg })
            }

            await sock.groupParticipantsUpdate(jid, [target], "promote")

            return sock.sendMessage(jid, {
                text: `✅ @${target.split("@")[0]} foi promovido a admin!`,
                mentions: [target]
            }, { quoted: msg })

        } catch (err) {
            console.error("Erro ao promover:", err)
            return sock.sendMessage(jid, { text: "❌ Não foi possível promover o usuário." }, { quoted: msg })
        }
    }
}
