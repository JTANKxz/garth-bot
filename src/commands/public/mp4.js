import fs from "fs";
import path from "path";
import yts from "yt-search";
import dxz from "dxz-ytdl";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

const { ytmp4 } = dxz;

export default {
    name: "mp4",
    aliases: ["video", "vid", "ytvideo"],
    description: "Baixa vídeo do YouTube e envia em MP4.",
    usage: "[nome do vídeo ou link]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const gConfig = getGroupConfig(jid);
        const botConfig = getBotConfig();
        const botName = botConfig.botName || "BOT";
        const prefix = gConfig.prefix;

        const query = args.join(" ").trim();

        if (!query) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(
                jid,
                { text: `❗ Use: ${prefix}mp4 [nome do vídeo]` },
                { quoted: msg }
            );
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let outputFile = null;

        try {
            let videoUrl;
            let metadata = {};

            if (query.startsWith("http")) {
                videoUrl = query;
            } else {
                const search = await yts(query);

                if (!search.videos.length) {
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return sock.sendMessage(
                        jid,
                        { text: `❌ Nenhum resultado encontrado para "${query}".` },
                        { quoted: msg }
                    );
                }

                const first = search.videos[0];
                videoUrl = first.url;

                metadata = {
                    title: first.title,
                    duration: first.timestamp || "Desconhecido",
                    channel: first.author?.name || "Canal desconhecido",
                    views: first.views
                        ? `${first.views.toLocaleString()} visualizações`
                        : "Visualizações desconhecidas",
                    thumbnail: first.thumbnail
                };
            }

            await sock.sendMessage(jid, { react: { text: "🔄", key: msg.key } });

            outputFile = path.join(process.cwd(), `temp-${Date.now()}.mp4`);

            const result = await ytmp4(videoUrl, "480p", {
                path: outputFile,
                retries: 3
            });

            const caption = `╔════ *${botName}* ════╗\n` +
                `> Título: ${metadata.title || result.title}\n` +
                `> Duração: ${metadata.duration || `${result.duration}s`}\n` +
                `> Canal: ${metadata.channel || result.author}\n` +
                `> ${metadata.views || ""}\n` +
                `> Link: ${videoUrl}\n` +
                `╚═════════════════╝`;

            await sock.sendMessage(
                jid,
                {
                    video: fs.readFileSync(outputFile),
                    mimetype: "video/mp4",
                    caption
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando mp4:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao processar sua solicitação." },
                { quoted: msg }
            );
        } finally {
            // Garantir que o arquivo seja deletado
            if (outputFile && fs.existsSync(outputFile)) {
                try {
                    fs.unlinkSync(outputFile);
                } catch (e) {
                    console.error("Erro ao deletar arquivo temporário:", e.message);
                }
            }
        }
    }
};
