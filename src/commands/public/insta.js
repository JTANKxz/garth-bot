import { instagramGetUrl } from "instagram-url-direct";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: "insta",
    aliases: [],
    description: "Baixa mídias de posts do Instagram",
    usage: "[link do post]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const gConfig = getGroupConfig(jid);
        const prefix = gConfig.prefix;
        const botConfig = getBotConfig();
        const botName = botConfig.botName || "BOT";
        const url = args[0];

        if (!url || !url.includes("instagram.com")) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(jid, {
                text: `❗ Use: ${prefix}insta [link]\nEx:\n${prefix}insta https://www.instagram.com/p/XXXX/`
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const data = await instagramGetUrl(url);

            if (!data?.media_details?.length) {
                throw new Error("Nenhuma mídia encontrada");
            }

            if (data.post_info?.is_private) {
                await sock.sendMessage(jid, { react: { text: "🔒", key: msg.key } });
                return sock.sendMessage(jid, {
                    text: "🔒 Este post é privado."
                }, { quoted: msg });
            }

            const caption =
                `╔════ *${botName}* ════╗
> 👤 Usuário: ${data.post_info.owner_username}

> ❤️ Curtidas: ${data.post_info.likes.toLocaleString()}

> 🔗 Link: ${url}
╚═════════════════╝`;

            let first = true;

            for (const media of data.media_details) {
                if (media.type === "image") {
                    await sock.sendMessage(jid, {
                        image: { url: media.url },
                        caption: first ? caption : undefined
                    }, { quoted: msg });
                }

                if (media.type === "video") {
                    await sock.sendMessage(jid, {
                        video: { url: media.url },
                        caption: first ? caption : undefined
                    }, { quoted: msg });
                }

                first = false;
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando instagram:", err);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(jid, {
                text: "❌ Erro ao baixar a mídia do Instagram."
            }, { quoted: msg });
        }
    }
};
