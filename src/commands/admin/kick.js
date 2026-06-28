import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

const cleanJid = (jidStr) => {
    if (!jidStr) return "";
    const [user, host] = jidStr.split("@");
    const cleanUser = user.split(":")[0];
    return `${cleanUser}@${host || "s.whatsapp.net"}`;
};

export default {
    name: "kick",
    aliases: ["k"],
    description: "Remove e adiciona à blacklist.",
    usage: "(@user motivo)",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const gConfig = getGroupConfig(jid)
        const prefix = gConfig.prefix || "!"
        const botConfig = getBotConfig()
        const sender = msg.key.participant

        let target
        let reason

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
            reason = args.join(" ") || "Sem motivo especificado"
        } else {
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}kick @user motivo ou responda a mensagem do usuário.`
                }, { quoted: msg })
            }
            target = mentions[0]
            reason = args.slice(1).join(" ") || "Sem motivo especificado"
        }

        const { getProtectedBy } = await import("../../utils/protect.js")
        const cleanTarget = cleanJid(target)
        const protectedBy = getProtectedBy(jid, cleanTarget)
        if (protectedBy) {
            const cleanProtector = cleanJid(protectedBy)
            return sock.sendMessage(jid, {
                text: `Voce não pode banir o usuario protegido por: @${cleanProtector.split('@')[0]}`,
                mentions: [cleanProtector]
            }, { quoted: msg })
        }

        const isCreator = cleanTarget === cleanJid(botConfig.botCreator)
        const isMaster = cleanTarget === cleanJid(botConfig.botMaster)
        const isOwner = gConfig.botOwners?.includes(cleanTarget)

        const jidBase = (x = "") => String(x).split("@")[0].split(":")[0];
        const isSenderCreator = jidBase(sender) === jidBase(botConfig.botCreator);

        if (isCreator || isMaster || (isOwner && !isSenderCreator)) {
            return sock.sendMessage(jid, {
                text: `❌ Você não pode remover o ${isCreator ? "criador" : isMaster ? "master" : "dono do bot"}!`
            }, { quoted: msg })
        }

        try {
            const cleanT = cleanJid(target)
            const cleanS = cleanJid(sender)
            
            await sock.groupParticipantsUpdate(jid, [cleanT], "remove")

            if (!gConfig.blacklisteds.includes(cleanT)) {
                gConfig.blacklisteds.push(cleanT)
                updateGroupConfig(jid, { blacklisteds: gConfig.blacklisteds })
            }

            const txt =
`╔═══✦ 🚫 *KICK* ✦═══
║ 👤 *Removido:* @${cleanT.split("@")[0]}
║ 🛡️ *Por:* @${cleanS.split("@")[0]}
║ 📝 *Motivo:* ${reason}
║ ⚠️ *Adicionado à blacklist do grupo*
╚═════════════════════`

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } })
            return sock.sendMessage(jid, {
                text: txt,
                mentions: [cleanT, cleanS]
            }, { quoted: msg })

        } catch (e) {
            console.error("Erro ao remover usuário:", e)
            return sock.sendMessage(jid, {
                text: "❌ Erro ao tentar remover o usuário."
            }, { quoted: msg })
        }
    }
}
