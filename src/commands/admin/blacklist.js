import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
    name: "bl",
    description: "Gerencia a blacklist.",
    usage: "(add/remove/list)",
    aliases: ["black", "blacklist"],
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const groupConfig = getGroupConfig(jid)
        const botConfig = getBotConfig()
        const blacklist = groupConfig.blacklisteds || []
        const command = args[0]?.toLowerCase()

        const normalizeJid = (jid) => {
            if (!jid) return jid

            // remove :1, :2, etc dos LIDs
            return jid.replace(/:\d+@lid$/i, "@lid")
        }

        const getTarget = () => {
            const ctx = msg.message?.extendedTextMessage?.contextInfo

            // menção
            if (ctx?.mentionedJid?.length) {
                return normalizeJid(ctx.mentionedJid[0])
            }

            // reply
            if (ctx?.participant) {
                return normalizeJid(ctx.participant)
            }

            // jid informado manualmente
            const manual = args[1]?.trim()
            if (!manual) return null

            // aceita qualquer @lid
            if (/@lid$/i.test(manual)) {
                return normalizeJid(manual)
            }

            // aceita @s.whatsapp.net
            if (/@s\.whatsapp\.net$/i.test(manual)) {
                return manual
            }

            // apenas números
            if (/^\d+$/.test(manual)) {
                return `${manual}@s.whatsapp.net`
            }

            return null
        }

        const formatUser = (user) =>
            user
                .replace(/:\d+@lid$/i, "@lid")
                .replace("@s.whatsapp.net", "")
                .replace("@lid", "")

        if (command === "list" || !command) {
            if (blacklist.length === 0) {
                return sock.sendMessage(
                    jid,
                    { text: "✅ A blacklist está vazia." },
                    { quoted: msg }
                )
            }

            let text = "╔═══✦ *🚫 BLACKLIST* ✦═══\n"
            const mentions = []

            blacklist.forEach((user, index) => {
                text += `║ ${index + 1}. ❌ @${formatUser(user)}\n`

                if (user.endsWith("@s.whatsapp.net")) {
                    mentions.push(user)
                }
            })

            text += "╚═════════════════════"

            return sock.sendMessage(jid, {
                text,
                mentions
            })
        }

        if (command === "add") {
            const target = getTarget()

            if (!target) {
                return sock.sendMessage(
                    jid,
                    {
                        text: "❌ Você precisa marcar um usuário, responder uma mensagem ou informar um JID."
                    },
                    { quoted: msg }
                )
            }

            const isCreator = normalizeJid(botConfig.botCreator) === target
            const isMaster = normalizeJid(botConfig.botMaster) === target
            const isOwner = groupConfig.botOwners?.some(
                owner => normalizeJid(owner) === target
            )

            if (isCreator || isMaster || isOwner) {
                return sock.sendMessage(
                    jid,
                    {
                        text: `❌ Você não pode adicionar o ${
                            isCreator
                                ? "criador"
                                : isMaster
                                ? "master"
                                : "dono do bot"
                        } na blacklist!`
                    },
                    { quoted: msg }
                )
            }

            if (blacklist.includes(target)) {
                return sock.sendMessage(
                    jid,
                    {
                        text: `⚠️ O usuário @${formatUser(target)} já está na blacklist.`,
                        mentions: target.endsWith("@s.whatsapp.net")
                            ? [target]
                            : []
                    },
                    { quoted: msg }
                )
            }

            blacklist.push(target)

            groupConfig.blacklisteds = blacklist
            updateGroupConfig(jid, groupConfig)

            return sock.sendMessage(jid, {
                text: `✅ Usuário @${formatUser(target)} foi adicionado à blacklist.`,
                mentions: target.endsWith("@s.whatsapp.net")
                    ? [target]
                    : []
            })
        }

        if (command === "remove") {
            const target =
                args[1] && !isNaN(args[1])
                    ? blacklist[parseInt(args[1]) - 1]
                    : getTarget()

            if (!target) {
                return sock.sendMessage(
                    jid,
                    {
                        text: "❌ Informe um usuário com @, responda uma mensagem, informe um JID ou use o número da lista."
                    },
                    { quoted: msg }
                )
            }

            const isCreator = normalizeJid(botConfig.botCreator) === target
            const isOwner = groupConfig.botOwners?.some(
                owner => normalizeJid(owner) === target
            )

            if (isCreator || isOwner) {
                return sock.sendMessage(
                    jid,
                    {
                        text: `❌ Você não pode remover o ${
                            isCreator ? "criador" : "dono do bot"
                        } da blacklist!`
                    },
                    { quoted: msg }
                )
            }

            if (!blacklist.includes(target)) {
                return sock.sendMessage(
                    jid,
                    {
                        text: `⚠️ O usuário @${formatUser(target)} não está na blacklist.`,
                        mentions: target.endsWith("@s.whatsapp.net")
                            ? [target]
                            : []
                    },
                    { quoted: msg }
                )
            }

            blacklist.splice(blacklist.indexOf(target), 1)

            groupConfig.blacklisteds = blacklist
            updateGroupConfig(jid, groupConfig)

            return sock.sendMessage(jid, {
                text: `🟢 Usuário @${formatUser(target)} foi removido da blacklist.`,
                mentions: target.endsWith("@s.whatsapp.net")
                    ? [target]
                    : []
            })
        }

        return sock.sendMessage(
            jid,
            {
                text:
                    "❌ Comando inválido.\n\n" +
                    "Use:\n" +
                    "• *bl add @user*\n" +
                    "• *bl add 92071968931959@lid*\n" +
                    "• *bl remove @user*\n" +
                    "• *bl remove 2*\n" +
                    "• *bl list*"
            },
            { quoted: msg }
        )
    }
}