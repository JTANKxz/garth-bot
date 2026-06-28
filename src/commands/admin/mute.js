import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

const cleanJid = (jidStr) => {
    if (!jidStr) return "";
    const [user, host] = jidStr.split("@");
    const cleanUser = user.split(":")[0];
    return `${cleanUser}@${host || "s.whatsapp.net"}`;
};

export default {
    name: "mute",
    description: "Silencia um usuário no grupo.",
    aliases: ["mutar", "silenciar", "m", "calar"],
    usage: "(@user)",
    category: "admin",

    async run({ sock, msg, args }) {

        const jid = msg.key.remoteJid
        if (!jid.endsWith("@g.us")) return

        const sender = msg.key.participant
        const gConfig = getGroupConfig(jid)
        const botConfig = getBotConfig()

        if (!gConfig.muteds) gConfig.muteds = {}
        const prefix = gConfig.prefix || "!"

        let target
        let duration = 0
        let reason = "Sem motivo especificado"

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
            duration = parseInt(args[0]) || 0
            reason = args.slice(1).join(" ") || "Sem motivo especificado"
        }

        else if (context?.mentionedJid?.length) {
            target = context.mentionedJid[0]
            duration = parseInt(args[1]) || 0
            reason = args.slice(2).join(" ") || "Sem motivo especificado"
        }

        else {
            return sock.sendMessage(jid, {
                text: `❌ Use:\n ${prefix}mute @user\n• ${prefix}mute @user 10 motivo\n• Ou responda uma mensagem`
            }, { quoted: msg })
        }

        const { getProtectedBy } = await import("../../utils/protect.js")
        const cleanTarget = cleanJid(target)
        const protectedBy = getProtectedBy(jid, cleanTarget)
        if (protectedBy) {
            const cleanProtector = cleanJid(protectedBy)
            return sock.sendMessage(jid, {
                text: `Voce não pode mutar o usuario protegido por: @${cleanProtector.split('@')[0]}`,
                mentions: [cleanProtector]
            }, { quoted: msg })
        }

        const isCreator = cleanTarget === cleanJid(botConfig.botCreator)
        const isMaster = cleanTarget === cleanJid(botConfig.botMaster)
        const isOwner = gConfig.botOwners?.includes(cleanTarget)

        const jidBase = (x = "") => String(x).split("@")[0].split(":")[0];
        const isSenderCreator = jidBase(sender) === jidBase(botConfig.botCreator);

        if (isCreator || isOwner || isMaster) {
            if (!isSenderCreator || !isOwner) {
                return sock.sendMessage(jid, {
                    text: `❌ Você não pode mutar o ${isCreator ? "criador" : isMaster ? "master" : "dono do bot"}!`
                }, { quoted: msg })
            }
        }

        const previous = gConfig.muteds[target] || { deletes: 0 }

        const expiresAt = duration > 0 ? Date.now() + duration * 60 * 1000 : null

        const cleanT = cleanJid(target)
        const cleanS = cleanJid(sender)

        gConfig.muteds[cleanT] = {
            muted: true,
            expiresAt,
            deletes: previous.deletes,
            by: cleanS
        }

        updateGroupConfig(jid, { muteds: gConfig.muteds })

        const muteMsg =
`╔═══✦ *🤐 MUTADO(A)* ✦═══
║ 👤 *Usuário:* @${cleanT.split('@')[0]}
║ 🛡️ *Por:* @${cleanS.split('@')[0]}
║ 📝 *Motivo:* ${reason}
║ ⏱️ *Duração:* ${duration > 0 ? duration + " min" : "Indefinido"}
╚═════════════════════`

        await sock.sendMessage(jid, {
            text: muteMsg,
            mentions: [cleanT, cleanS]
        }, { quoted: msg })

        if (duration > 0) {
            setTimeout(async () => {
                const updated = getGroupConfig(jid)
                if (!updated.muteds[cleanT]) return

                delete updated.muteds[cleanT]
                updateGroupConfig(jid, { muteds: updated.muteds })

                const txt =
`╔═══✦ *🔊 DESMUTADO(A)* ✦═══
║ 👤 @${cleanT.split('@')[0]}
║ ⏱️ Tempo concluído: ${duration} min
╚═════════════════════`

                await sock.sendMessage(jid, {
                    text: txt,
                    mentions: [cleanT]
                })
            }, duration * 60 * 1000)
        }
    }
}
