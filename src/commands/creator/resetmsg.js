import { removeUser as removeMainUser, removeGroup as removeMainGroup } from '../../features/messageCounts.js';
import { removeUser as removeSimpleUser, resetGroup as removeSimpleGroup } from '../../features/simpleMessageCounts.js';
import { getBotConfig } from '../../config/botConfig.js';

export default {
    name: "resetmsg",
    aliases: ["limparmsg", "zerarmsg"],
    description: "Reseta o contador de mensagens de um usuário ou de todo o grupo (Criador)",
    category: "creator",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const botConfig = getBotConfig();

        // Apenas Criador
        if (sender !== botConfig.botCreator && sender !== botConfig.botMaster) {
            return sock.sendMessage(from, { text: "❌ Comando restrito ao criador do bot." }, { quoted: msg });
        }

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = contextInfo?.mentionedJid?.[0];
        const replied = contextInfo?.participant;
        const target = mentioned || replied;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            if (target) {
                // Resetar usuário específico
                removeMainUser(from, target);
                removeSimpleUser(from, target);

                await sock.sendMessage(from, {
                    text: `✅ O contador de mensagens de @${target.split('@')[0]} foi resetado com sucesso no grupo.`,
                    mentions: [target]
                }, { quoted: msg });

            } else if (args[0] === "todos" || args[0] === "grupo") {
                // Resetar grupo inteiro
                removeMainGroup(from);
                removeSimpleGroup(from);

                await sock.sendMessage(from, {
                    text: `📊 O ranking de mensagens deste grupo foi totalmente resetado.`
                }, { quoted: msg });

            } else {
                return sock.sendMessage(from, {
                    text: `❓ *Como usar:*\n\n1️⃣ Marque alguém: *!resetmsg @user*\n2️⃣ Responda a uma msg: *!resetmsg*\n3️⃣ Resetar grupo: *!resetmsg todos*`
                }, { quoted: msg });
            }

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando resetmsg:", err);
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
        }
    }
};
