
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js";

export default {
    name: "block",
    description: "Bloqueia um usuário de usar o bot no grupo",
    usage: "@usuário ou respondendo a mensagem",
    aliases: ["banuser", "block"],
    category: "owner",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const groupConfig = getGroupConfig(jid);
        const prefix = groupConfig.prefix || "!";

        const context = msg.message.extendedTextMessage?.contextInfo;

        const mentionedId = context?.mentionedJid?.[0];

        let repliedId;
        if (context?.quotedMessage) {
            repliedId = context.participant || context.quotedMessage?.key?.participant;
        }

        const targetId = mentionedId || repliedId;
        if (!targetId) {
            return sock.sendMessage(jid, {
                text: `❌ Use: ${prefix}blockuser @usuário ou respondendo à mensagem de um usuário.`,
            }, { quoted: msg });
        }

        if (!groupConfig.blockedUsers) groupConfig.blockedUsers = [];

        if (groupConfig.blockedUsers.includes(targetId)) {
            return sock.sendMessage(jid, {
                text: `✅ Usuário já está bloqueado de usar o bot.`,
            }, { quoted: msg });
        }

        groupConfig.blockedUsers.push(targetId);
        updateGroupConfig(jid, { blockedUsers: groupConfig.blockedUsers });

        await sock.sendMessage(jid, {
            text: `✅ Usuário @${targetId.split("@")[0]} foi bloqueado de usar o bot.`,
            mentions: [targetId],
        }, { quoted: msg });
    }
};
