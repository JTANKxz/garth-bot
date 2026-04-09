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

        const getTarget = () => {
            const ctx = msg.message?.extendedTextMessage?.contextInfo
            if (!ctx) return null
            if (ctx.mentionedJid?.length) return ctx.mentionedJid[0]
            if (ctx.participant) return ctx.participant
            return null
        }

        if (command === "list" || !command) {
            if (blacklist.length === 0) return sock.sendMessage(jid, { text: "✅ A blacklist está vazia." }, { quoted: msg })

            let text = '╔═══✦ *🚫 BLACKLIST* ✦═══\n'
            let mentions = []
            let i = 1

            for (const user of blacklist) {
                text += `║ ${i}. ❌ @${user.split('@')[0]}\n`
                mentions.push(user)
                i++
            }

            text += '╚═════════════════════'
            return sock.sendMessage(jid, { text, mentions })
        }

        if (command === "add") {
            const target = getTarget()
            if (!target) return sock.sendMessage(jid, {
                text: "❌ Você precisa marcar um usuário ou responder a mensagem dele."
            }, { quoted: msg })

            const isCreator = target === botConfig.botCreator
            const isMaster = target === botConfig.botMaster
            const isOwner = groupConfig.botOwners?.includes(target)
            if (isCreator || isMaster || isOwner) {
                return sock.sendMessage(jid, {
                    text: `❌ Você não pode adicionar o ${isCreator ? "criador" : isMaster ? "master" : "dono do bot"} na blacklist!`
                }, { quoted: msg })
            }

            if (blacklist.includes(target)) {
                return sock.sendMessage(jid, {
                    text: `⚠️ O usuário @${target.split("@")[0]} já está na blacklist.`,
                    mentions: [target]
                }, { quoted: msg })
            }

            blacklist.push(target)
            groupConfig.blacklisteds = blacklist
            updateGroupConfig(jid, groupConfig)

            return sock.sendMessage(jid, {
                text: `✅ Usuário @${target.split("@")[0]} foi adicionado à blacklist.`,
                mentions: [target]
            })
        }

        if (command === "remove") {

            const target = args[1] && !isNaN(args[1]) ? blacklist[parseInt(args[1]) - 1] : getTarget()
            if (!target) return sock.sendMessage(jid, {
                text: "❌ Informe um usuário com @, responda a mensagem dele ou use o número da lista (/bl remove 2)."
            }, { quoted: msg })

            const isCreator = target === botConfig.botCreator
            const isOwner = groupConfig.botOwners?.includes(target)
            if (isCreator || isOwner) {
                return sock.sendMessage(jid, {
                    text: `❌ Você não pode remover o ${isCreator ? "criador" : "dono do bot"} da blacklist!`
                }, { quoted: msg })
            }

            if (!blacklist.includes(target)) {
                return sock.sendMessage(jid, {
                    text: `⚠️ O usuário @${target.split("@")[0]} não está na blacklist.`,
                    mentions: [target]
                }, { quoted: msg })
            }

            blacklist.splice(blacklist.indexOf(target), 1)
            groupConfig.blacklisteds = blacklist
            updateGroupConfig(jid, groupConfig)

            return sock.sendMessage(jid, {
                text: `🟢 Usuário @${target.split("@")[0]} foi removido da blacklist.`,
                mentions: [target]
            })
        }

        return sock.sendMessage(jid, {
            text: "❌ Comando inválido.\nUse:\n\n• *bl add @user*\n• *bl remove @user / reply / número*\n• *bl list*"
        }, { quoted: msg })
    }
}
