import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"
import { applyWarning } from "../../features/warning.js" 

const cleanJid = (jidStr) => {
    if (!jidStr) return "";
    const [user, host] = jidStr.split("@");
    const cleanUser = user.split(":")[0];
    return `${cleanUser}@${host || "s.whatsapp.net"}`;
}; 

export default {
    name: "warn",
    aliases: ["adv"],
    description: "Aplica uma advertência a um usuário.",
    usage: "(@user)",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const sender = msg.key.participant
        const groupConfig = getGroupConfig(jid)
        const botConfig = getBotConfig()
        const prefix = groupConfig.prefix || "!"

        let target
        let reason = args.join(" ") || "Sem motivo especificado"

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
        } else {
            
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}warn @user motivo ou responda uma mensagem.`,
                }, { quoted: msg })
            }
            target = mentions[0]
        }

        const cleanTarget = cleanJid(target)
        const cleanSender = cleanJid(sender)

        const isCreator = cleanTarget === cleanJid(botConfig.botCreator)
        const isMaster = cleanTarget === cleanJid(botConfig.botMaster)
        const isOwner = groupConfig.botOwners?.includes(cleanTarget)

        const jidBase = (x = "") => String(x).split("@")[0].split(":")[0];
        const isSenderCreator = jidBase(cleanSender) === jidBase(botConfig.botCreator);

        if (isCreator || isMaster || (isOwner && !isSenderCreator)) {
            return sock.sendMessage(jid, {
                text: `❌ Você não pode advertir o ${isCreator ? "criador" : isMaster ? "master" : "dono do bot"}!`
            }, { quoted: msg })
        }

        const { getProtectedBy } = await import("../../utils/protect.js")
        const protectedBy = getProtectedBy(jid, cleanTarget)
        if (protectedBy) {
            const cleanProtector = cleanJid(protectedBy)
            return sock.sendMessage(jid, {
                text: `❌ Você não pode advertir o usuário protegido por: @${cleanProtector.split('@')[0]}`,
                mentions: [cleanProtector]
            }, { quoted: msg })
        }

        try {
            await applyWarning(sock, jid, cleanTarget, cleanSender, reason)
        } catch (err) {
            console.error("Erro ao aplicar warn:", err)
            await sock.sendMessage(jid, { text: "❌ Erro ao aplicar a advertência." }, { quoted: msg })
        }
    }
}
