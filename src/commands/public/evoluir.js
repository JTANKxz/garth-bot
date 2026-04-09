import { messageCount, saveCounts } from '../../features/messageCounts.js'

export default {
    name: "evoluir",
    aliases: [],
    description: "Evolui atributos do usuário usando pontos de popularidade",
    showInMenu: true,
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const [_, atributo, qtdStr] = text.split(' ');
            const quantidade = parseInt(qtdStr);

            if (!atributo || isNaN(quantidade) || quantidade <= 0) {
                await sock.sendMessage(from, {
                    text: "❌ Comando inválido! Use: *!evoluir [atributo] [quantidade]*"
                }, { quoted: msg });

                await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
                return;
            }

            const atributosValidos = {
                'força': 'forca',
                'vida': 'life',
                'proteção': 'protection',
                'agilidade': 'agility'
            };

            const atributoConvertido = atributosValidos[atributo.toLowerCase()];
            if (!atributoConvertido) {
                await sock.sendMessage(from, {
                    text: `❌ Atributo inválido! Apenas: ${Object.keys(atributosValidos).join(', ')}`
                }, { quoted: msg });

                await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
                return;
            }

            if (!messageCount[from] || !messageCount[from][sender]) {
                await sock.sendMessage(from, {
                    text: "❌ Você ainda não possui atributos para evoluir."
                }, { quoted: msg });

                await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
                return;
            }

            const userData = messageCount[from][sender];

            userData.popularity = userData.popularity || 0;
            userData.forca = userData.forca || 0;
            userData.life = userData.life || 100;
            userData.protection = userData.protection || 0;
            userData.agility = userData.agility || 0;
            userData.spentPopularity = userData.spentPopularity || 0;

            if (userData.popularity < quantidade) {
                await sock.sendMessage(from, {
                    text: `❌ Você não tem pontos suficientes! Popularidade atual: ${userData.popularity}`
                }, { quoted: msg });

                await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
                return;
            }

            if (atributoConvertido === 'life') {
                userData.life += 100 * quantidade;
            } else {
                userData[atributoConvertido] += quantidade;
            }

            userData.popularity -= quantidade;
            userData.spentPopularity += quantidade;

            saveCounts();

            await sock.sendMessage(from, {
                text: `✅ Você evoluiu *${quantidade}* pontos em *${atributoConvertido}*!\n💬 Popularidade restante: *${userData.popularity}*`,
                mentions: [sender]
            }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando evoluir:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(from, {
                text: "❌ Ocorreu um erro ao evoluir seus atributos."
            }, { quoted: msg });
        }
    }
};
