import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"

export const commandExport = {
    name: "unwarn",
    category: "admin"
}

export async function removeWarning(jid, userJid, amount = 1) {
    const groupConfig = getGroupConfig(jid)

    if (!groupConfig.warnings) groupConfig.warnings = {}
    if (!groupConfig.warnings[userJid]) groupConfig.warnings[userJid] = 0

    groupConfig.warnings[userJid] -= amount

    if (groupConfig.warnings[userJid] <= 0) {
        const { [userJid]: _, ...rest } = groupConfig.warnings
        groupConfig.warnings = rest
    }

    updateGroupConfig(jid, { warnings: groupConfig.warnings })

    return groupConfig.warnings[userJid] || 0
}

export default {
    name: "unwarn",
    description: "Remove advertências de um usuário do grupo.",
    aliases: ["noadv", "deladv"],
    usage: "(@user)",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const sender = msg.key.participant
        const groupConfig = getGroupConfig(jid)
        const prefix = groupConfig.prefix || "!"

        let target
        let amount = args[0] ? parseInt(args[0], 10) : 1

        const context = msg.message?.extendedTextMessage?.contextInfo
        const quoted = context?.quotedMessage

        if (quoted) {
            target = context.participant
        } else {
            
            const mentions = context?.mentionedJid || []
            if (mentions.length === 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Use: ${prefix}unwarn @user [quantidade] ou responda uma mensagem.`,
                }, { quoted: msg })
            }
            target = mentions[0]
        }

        try {
            const total = await removeWarning(jid, target, amount)
            await sock.sendMessage(jid, {
                text: `✅ Usuário @${target.split("@")[0]} agora possui ${total} advertência(s).`,
                mentions: [target]
            })
        } catch (err) {
            console.error("Erro ao remover advertência:", err)
            await sock.sendMessage(jid, { text: "❌ Erro ao remover advertência." }, { quoted: msg })
        }
    }
}
