import axios from "axios";
import { GOOGLE_IMG_SCRAP } from "google-img-scrap";
import { getGroupConfig } from "../../utils/groups.js";

export default {
    name: "buscar",
    aliases: ["img", "image", "foto", "imagem"],
    description: "Busca uma imagem no Google Imagens",
    usage: "[termo]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const gConfig = getGroupConfig(jid);
        const prefix = gConfig.prefix;
        const query = args.join(" ");

        if (!query) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(jid, {
                text: `❗ Use: ${prefix}buscar [termo]\nEx: ${prefix}buscar cachorro fofinho`
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const results = await GOOGLE_IMG_SCRAP({
                search: query,
                limit: 10, 
                safeSearch: true
            });

            const list = results?.result || [];
            if (list.length === 0) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return sock.sendMessage(jid, {
                    text: `❌ Nenhuma imagem encontrada para "${query}".`
                }, { quoted: msg });
            }

            let validImage = null;

            for (const img of list) {
                try {
                    const head = await axios.head(img.url, { timeout: 7000 });

                    const type = head.headers["content-type"] || "";
                    const size = parseInt(head.headers["content-length"] || "0");

                    if (!type.startsWith("image/")) continue;

                    if (size > 8 * 1024 * 1024) continue;

                    validImage = img;
                    break;
                } catch (e) {
                    continue; 
                }
            }

            if (!validImage) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return sock.sendMessage(jid, {
                    text: "❌ Não foi possível carregar imagens compatíveis."
                }, { quoted: msg });
            }

            await sock.sendMessage(jid, {
                image: { url: validImage.url },
                caption: `📸 *Resultado de:* _${query}_`
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando buscar:", err);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(jid, {
                text: "❌ Ocorreu um erro ao buscar a imagem."
            }, { quoted: msg });
        }
    }
};
