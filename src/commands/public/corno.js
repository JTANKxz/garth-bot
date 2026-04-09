import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cornoAttempts = {};

export default {
    name: "corno",
    description: "Calcula porcentagem de corno de um usuário e envia prova se >80%",
    usage: "[@mencionar]",
    category: "fun",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const sender = msg.key.participant || jid;

            const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

            const targetId = mentions[0] || sender;
            const username = targetId.split("@")[0];

            cornoAttempts[targetId] = (cornoAttempts[targetId] || 0) + 1;
            const tentativa = cornoAttempts[targetId];

            const tentativaMsgs = {
                2: `@${username} 🤨 Tentando esconder algo? Tá querendo disfarçar, né?`,
                3: `@${username} 😑 Não adianta insistir... o destino já tá traçado, chifrudo!`,
                4: `@${username} 😂 Quanto mais tenta, mais aparece o par de antenas!`,
                5: `@${username} 🤣 Tá achando que dá pra mudar? A galhada já tá formada!`,
                6: `@${username} 🐂 Aceita que dói menos, o "Rei dos Cornos" tá entre nós!`
            };

            if (tentativaMsgs[tentativa]) {
                await sock.sendMessage(
                    jid,
                    { text: tentativaMsgs[tentativa], mentions: [targetId] },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            if (tentativa > 6) cornoAttempts[targetId] = 1;

            const percentage = Math.floor(Math.random() * 101);
            let messageText = `@${username}, você é ${percentage}% corno.`;

            const reacoes = [
                { max: 15, text: "😌 Tá tranquilo, parece que não é corno." },
                { max: 25, text: "🤨 Tá na dúvida? Tá limpo, por enquanto." },
                { max: 50, text: "🤔 Uns chifrinhos pequenos, talvez." },
                { max: 75, text: "😬 A situação tá complicada, cuidado." },
                { max: 85, text: "😱 Ih rapaz, tá botando galhada!" },
                { max: 101, text: "💀 Não tem jeito... você é o Rei dos Cornos!" }
            ];

            const reacao = reacoes.find(r => percentage < r.max);
            if (reacao) messageText += `\n${reacao.text}`;

            await sock.sendMessage(
                jid,
                { text: messageText, mentions: [targetId] },
                { quoted: msg }
            );

            if (percentage > 80) {
                await sock.sendMessage(
                    jid,
                    {
                        image: { url: path.join(__dirname, '../../../assets/images/corno.jpeg') },
                        caption: `Vazou o @${username} KKKKKK`,
                        mentions: [targetId]
                    },
                    { quoted: msg }
                );

                await sock.sendMessage(
                    jid,
                    {
                        audio: { url: path.resolve(__dirname, '../../../assets/audios/manganga.mp3') },
                        mimetype: 'audio/mp3',
                        ptt: true
                    },
                    { quoted: msg }
                );
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando corno:", err);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                jid,
                { text: "❌ Erro ao calcular porcentagem de corno." },
                { quoted: msg }
            );
        }
    }
};
