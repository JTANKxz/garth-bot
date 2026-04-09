import { getGroupConfig } from "../../utils/groups.js";

export default {
    name: "ship",
    aliases: ["compatibilidade", "love"],
    description: "Calcula compatibilidade entre duas pessoas",
    usage: "[@mencionar]",
    category: "fun",

    async run({ sock, msg }) {
        const groupJid = msg.key.remoteJid;

        const prefix = getGroupConfig(groupJid).prefix;

        const sender = msg.key.participant || groupJid;
        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";
        const mentions =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        await sock.sendMessage(groupJid, { react: { text: "⏳", key: msg.key } });

        try {
            const groupMetadata = await sock.groupMetadata(groupJid);

            const validParticipants = groupMetadata.participants
                .filter(p => !p.isAdmin && p.id !== sock.user.id)
                .map(p => p.id);

            let user1, user2;

            if (text.trim().split(/\s+/)[1] === ".") {
                user1 = sender;
                const others = validParticipants.filter(id => id !== sender);

                if (others.length === 0) {
                    await sock.sendMessage(groupJid, {
                        react: { text: "❌", key: msg.key }
                    });

                    return sock.sendMessage(
                        groupJid,
                        { text: "❗ Não há membros suficientes para usar esse formato!" },
                        { quoted: msg }
                    );
                }

                user2 = others[Math.floor(Math.random() * others.length)];

            } else if (mentions.length === 2) {
                
                [user1, user2] = mentions;

            } else if (mentions.length === 1) {
                
                user1 = mentions[0];
                user2 = sender;

            } else {
                
                if (validParticipants.length < 2) {
                    await sock.sendMessage(groupJid, {
                        react: { text: "❌", key: msg.key }
                    });

                    return sock.sendMessage(
                        groupJid,
                        { text: "❗ O grupo precisa de ao menos 2 participantes (não-admin)!" },
                        { quoted: msg }
                    );
                }

                do {
                    user1 =
                        validParticipants[
                        Math.floor(Math.random() * validParticipants.length)
                        ];
                    user2 =
                        validParticipants[
                        Math.floor(Math.random() * validParticipants.length)
                        ];
                } while (user1 === user2);
            }

            const percent = Math.floor(Math.random() * 101);

            const frases = [
                "😬 Fujam! Não combinam nem um pouco!",
                "🤨 Hmm, difícil esse casal hein...",
                "🤔 Podia ser melhor... ou pior.",
                "👀 Tem química aí, hein.",
                "💘 Shippo real oficial!",
                "💖💍 É amor verdadeiro, sem dúvidas!"
            ];

            const frase =
                percent < 15 ? frases[0] :
                    percent < 30 ? frases[1] :
                        percent < 50 ? frases[2] :
                            percent < 75 ? frases[3] :
                                percent < 90 ? frases[4] :
                                    frases[5];

            const result =
                `🔮 *Calculando compatibilidade...*\n\n` +
                `@${user1.split("@")[0]} ❤️ @${user2.split("@")[0]} = *${percent}%*\n\n${frase}`;

            await sock.sendMessage(
                groupJid,
                {
                    text: result,
                    mentions: [user1, user2]
                },
                { quoted: msg }
            );

            await sock.sendMessage(groupJid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando ship:", err);

            await sock.sendMessage(groupJid, {
                react: { text: "❌", key: msg.key }
            });

            return sock.sendMessage(
                groupJid,
                { text: "❌ Ocorreu um erro ao calcular o ship." },
                { quoted: msg }
            );
        }
    }
};
