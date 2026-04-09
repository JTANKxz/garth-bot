const feioAttempts = {};

export default {
    name: "feio",
    aliases: ["feio"],
    description: "Calcula porcentagem de feiúra de um usuário",
    usage: "[@mencionar]",
    category: "fun",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const sender = msg.key.participant || jid;

            const text = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                "";

            const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

            const targetId = mentions[0] || sender;
            const username = targetId.split("@")[0];

            feioAttempts[targetId] = (feioAttempts[targetId] || 0) + 1;
            const tentativa = feioAttempts[targetId];

            const tentativaMsgs = {
                2: `@${username} 🤨 Tentando mudar o destino?`,
                3: `@${username} 😑 Não adianta insistir...`,
            };

            if (tentativaMsgs[tentativa]) {
                await sock.sendMessage(
                    jid,
                    {
                        text: tentativaMsgs[tentativa],
                        mentions: [targetId]
                    },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            if (tentativa > 3) feioAttempts[targetId] = 1;

            const percentage = Math.floor(Math.random() * 101);

            let messageText = `@${username}, você é ${percentage}% feio.`;

            const reacoes = [
                { max: 15, text: "💅 Você é considerado bonito!" },
                { max: 25, text: "😌 Isso é aceitável, quase beleza!" },
                { max: 50, text: "🤔 Você é um pouco feio." },
                { max: 75, text: "😬 Você é feio!" },
                { max: 85, text: "😱 Você é muito feio!" },
                { max: 101, text: "💀 Você é FEIO DEMAIS!" }
            ];

            const reacao = reacoes.find(r => percentage < r.max);
            if (reacao) messageText += `\n${reacao.text}`;

            await sock.sendMessage(
                jid,
                {
                    text: messageText,
                    mentions: [targetId]
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando feio:", err);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                jid,
                { text: "❌ Erro ao calcular feiúra." },
                { quoted: msg }
            );
        }
    }
};
