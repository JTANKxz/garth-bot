import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

const cleanJid = (jidStr) => {
    if (!jidStr) return "";
    const [user, host] = jidStr.split("@");
    const cleanUser = user.split(":")[0];
    return `${cleanUser}@${host || "s.whatsapp.net"}`;
};

export default {
    name: "ban",
    aliases: ["b", "remove"],
    usage: "(@user motivo)",
    description: "Remove um usuário.",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const gConfig = getGroupConfig(jid)
        const prefix = gConfig.prefix || "!"
        const sender = msg.key.participant
        const botConfig = getBotConfig()

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        let target
        let reason

        if (quoted) {
            target = context.participant
            reason = args.join(" ") || "Sem motivo especificado"
        } else {
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}ban @user motivo ou responda uma mensagem.`
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

        if (isCreator || isMaster) {

            if (sender === botConfig.botCreator || sender === botConfig.botMaster) {
                return sock.sendMessage(jid, {
                    text: "🤨 Ué, isso não faz sentido."
                }, { quoted: msg })
            }

            try {
                
                await sock.groupParticipantsUpdate(jid, [sender], "remove")

                const txt =
`KKKKK louco e sonhador`

                return sock.sendMessage(jid, {
                    text: txt,
                    mentions: [sender]
                }, { quoted: msg })

            } catch (e) {
                console.error("Erro no ban reverso:", e)
                return sock.sendMessage(jid, {
                    text: "❌ Erro ao aplicar o ban reverso."
                }, { quoted: msg })
            }
        }

        // Tentou banir o BOT — remove o admin que tentou (exceto superadmin e criador)
        const botJid = sock.user.id
        const targetIsBotId = target === botJid || cleanJid(target) === cleanJid(botJid)
        if (targetIsBotId) {
            // Verifica se o sender é superadmin ou criador
            const groupMeta = await sock.groupMetadata(jid).catch(() => null)
            const senderEntry = groupMeta?.participants.find(p => p.id === sender)
            const senderIsSuperAdmin = senderEntry?.admin === "superadmin"
            const senderIsCreator = sender === botConfig.botCreator || sender === botConfig.botMaster

            if (senderIsSuperAdmin || senderIsCreator) {
                return sock.sendMessage(jid, { text: "🤨 Ué, isso não faz sentido." }, { quoted: msg })
            }

            try {
                await sock.sendMessage(jid, {
                    text: `KKKKKK tentou me banir 💀`,
                    mentions: [sender]
                }, { quoted: msg })
                await sock.groupParticipantsUpdate(jid, [sender], "remove")
            } catch (e) {
                console.error("Erro ao remover admin que tentou banir o bot:", e)
            }
            return
        }


        const jidBase = (x = "") => String(x).split("@")[0].split(":")[0];
        const isSenderCreator = jidBase(sender) === jidBase(botConfig.botCreator);

        if (isOwner && !isSenderCreator) {
            return sock.sendMessage(jid, {
                text: "❌ Você não pode banir um dono do bot."
            }, { quoted: msg })
        }

        try {
            const cleanT = cleanJid(target)
            const cleanS = cleanJid(sender)
            await sock.groupParticipantsUpdate(jid, [cleanT], "remove")

            const txt =
`╔═══✦ 🚫 *BANIDO* ✦═══
║ 👤 *Banido:* @${cleanT.split("@")[0]}
║ 🛡️ *Por:* @${cleanS.split("@")[0]}
║ 📝 *Motivo:* ${reason}
╚═════════════════════`

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } })

            return sock.sendMessage(jid, {
                text: txt,
                mentions: [cleanT, cleanS]
            }, { quoted: msg })

        } catch (e) {
            console.error("Erro ao banir:", e)
            return sock.sendMessage(jid, {
                text: "❌ Erro ao tentar banir o usuário."
            }, { quoted: msg })
        }
    }
}
