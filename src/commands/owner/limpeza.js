import { simpleMessageCount, saveCounts } from '../../features/simpleMessageCounts.js'

export default {
    name: "limpeza",
    aliases: ["limpezasemana", "limparsemana"],
    description: "Remove membros com menos mensagens que o limite definido na semana",
    category: "owner",

    async run({ sock, msg }) {
        const groupJid = msg.key.remoteJid;

        await sock.sendMessage(groupJid, { react: { text: "⏳", key: msg.key } });

        try {
            
            const fullText = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const args = fullText.split(' ').slice(1); 
            
            const mentionedJids = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

            if (!args.length) {
                await sock.sendMessage(groupJid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(groupJid, {
                    text: "⚠️ Uso correto:\n\nlimpezaweek <mínimo>\nlimpezaweek <mínimo-msgs>/<quantidade-membros>",
                }, { quoted: msg });
            }

            let [minStr, limitStr] = args[0].trim().split("/");
            const minMsgs = parseInt(minStr);
            const maxRemove = limitStr ? parseInt(limitStr) : null;

            if (isNaN(minMsgs) || (limitStr && isNaN(maxRemove))) {
                await sock.sendMessage(groupJid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(groupJid, {
                    text: "❌ Valores inválidos. Exemplo: limpezaweek 20 ou limpezaweek 20/100",
                }, { quoted: msg });
            }

            let metadata;
            try {
                metadata = await sock.groupMetadata(groupJid);
            } catch (e) {
                await sock.sendMessage(groupJid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(groupJid, {
                    text: "⚠️ Não consegui acessar os membros do grupo.",
                }, { quoted: msg });
            }

            const botJid = sock.user.id; 
            if (!simpleMessageCount[groupJid]) simpleMessageCount[groupJid] = {};

            metadata.participants.forEach(p => {
                if (!simpleMessageCount[groupJid][p.id]) {
                    simpleMessageCount[groupJid][p.id] = 0;
                }
            });

            let toRemove = metadata.participants
                .filter(p => {
                    const pId = p.id;
                    const isAdmin = p.admin !== null;
                    const isBot = pId === botJid;
                    const userCount = simpleMessageCount[groupJid][pId] || 0;

                    const isException = mentionedJids.includes(pId);

                    return !isAdmin && !isBot && userCount < minMsgs && !isException;
                })
                .map(p => p.id);

            if (maxRemove) toRemove = toRemove.slice(0, maxRemove);

            if (toRemove.length === 0) {
                await sock.sendMessage(groupJid, { react: { text: "✅", key: msg.key } });
                return await sock.sendMessage(groupJid, {
                    text: `✅ Nenhum membro removível tem menos de ${minMsgs} mensagens nesta semana.`,
                }, { quoted: msg });
            }

            const removeListText = toRemove
                .map(jid => {
                    const count = simpleMessageCount[groupJid][jid] || 0;
                    return `@${jid.split('@')[0]} — ${count} msgs`;
                })
                .join('\n');

            await sock.sendMessage(groupJid, {
                text: `⚠️ Serão removidos ${toRemove.length} membros com menos de ${minMsgs} mensagens nesta semana:\n\n${removeListText}`,
                mentions: toRemove
            }, { quoted: msg });

            for (const jid of toRemove) {
                try {
                    await sock.groupParticipantsUpdate(groupJid, [jid], "remove");
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) {
                    console.error(`Erro ao remover ${jid}:`, e);
                }

                if (simpleMessageCount[groupJid]?.[jid]) {
                    delete simpleMessageCount[groupJid][jid];
                }
            }

            saveCounts();

            await sock.sendMessage(groupJid, { react: { text: "✅", key: msg.key } });

            const finalText = limitStr
                ? "✅ Limpeza rápida concluída!"
                : "✅ Limpeza semanal concluída!";

            await sock.sendMessage(groupJid, {
                text: finalText,
            }, { quoted: msg });

        } catch (err) {
            console.error("Erro no comando limpezaweek:", err);
            await sock.sendMessage(groupJid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(groupJid, {
                text: "❌ Ocorreu um erro ao executar a limpeza semanal.",
            }, { quoted: msg });
        }
    }
}
