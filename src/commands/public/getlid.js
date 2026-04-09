export default {
    name: "getlid",
    aliases: ["lid", "idget", "getid"],
    description: "Mostra o LID do remetente, de um usuário mencionado ou da mensagem respondida",
    usage: "[@mencionar]",
    category: "utils",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const isGroup = jid.endsWith("@g.us");

            const sender = msg.key.participant || msg.key.remoteJid;

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

            const mentioned = contextInfo?.mentionedJid?.[0];

            const quoted = contextInfo?.participant;

            const target = mentioned || quoted || sender;

            const text = isGroup
                ? `📌 *LID do participante:* ${target}`
                : `📌 *Seu LID:* ${target}`;

            await sock.sendMessage(
                jid,
                { text },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando getlid:", err);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                jid,
                { text: "❌ Erro ao obter o LID." },
                { quoted: msg }
            );
        }
    }
};
