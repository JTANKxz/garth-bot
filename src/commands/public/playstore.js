import gplay from "google-play-scraper";
import { getGroupConfig } from "../../utils/groups.js";
import { createAppSearch } from "../../listeners/playstore.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: "playstore",
    aliases: [],
    description: "Busca apps no Google Play de forma interativa",
    usage: "[termo]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const gConfig = getGroupConfig(jid);
        const botConfig = getBotConfig();
        const botName = botConfig.botName || "BOT";
        const prefix = gConfig.prefix;
        const query = args.join(" ");

        if (!query) {
            return sock.sendMessage(
                jid,
                {
                    text:
                        `╔════ *${botName}* ════╗
> Uso incorreto
>
> Exemplo:
> ${prefix}playstore WhatsApp
╚═════════════════╝`
                },
                { quoted: msg }
            );
        }

        await sock.sendMessage(jid, {
            react: { text: "⏳", key: msg.key }
        });

        try {

            const searchResults = await gplay.search({
                term: query,
                num: 5,
                lang: "pt",
                country: "br"
            });

            const paidResults = await gplay.list({
                collection: gplay.collection.TOP_PAID,
                num: 10,
                lang: "pt",
                country: "br"
            });

            const mergedResults = [
                ...searchResults,
                ...paidResults.filter(app =>
                    app.title?.toLowerCase().includes(query.toLowerCase())
                )
            ].slice(0, 5);

            if (!mergedResults.length) {
                return sock.sendMessage(
                    jid,
                    {
                        text:
                            `╔════ *${botName}* ════╗
> Nenhum app encontrado
>
> Busca:
> ${query}
╚═════════════════╝`
                    },
                    { quoted: msg }
                );
            }

            let textList =
                `╔════ *${botName}* ════╗
> Resultados para:
> ${query}

`;

            mergedResults.forEach((app, i) => {
                textList +=
                    `> (${i + 1}) ${app.title}
> Dev: ${app.developer || "Desconhecido"}
> Nota: ${app.scoreText || "N/A"}

`;
            });

            textList +=
                `> Envie o número do app
> para ver os detalhes
╚═════════════════╝`;

            await sock.sendMessage(
                jid,
                {
                    image: { url: mergedResults[0].icon },
                    caption: textList
                },
                { quoted: msg }
            );

            createAppSearch(sender, jid, mergedResults);

            await sock.sendMessage(jid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (err) {
            console.error("Erro playstore:", err);
            return sock.sendMessage(
                jid,
                {
                    text:
                        `╔════ *${botName}* ════╗
> Erro ao buscar o aplicativo
╚═════════════════╝`
                },
                { quoted: msg }
            );
        }
    }
};
