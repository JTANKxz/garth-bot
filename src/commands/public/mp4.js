import fs from "fs";
import path from "path";
import yts from "yt-search";
import dxz from "dxz-ytdl";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

const { ytmp4 } = dxz;

// Cooldown DB (persistente, funciona mesmo se reiniciar)
const cooldownPath = path.resolve("src/database/mp4Cooldown.json");
const COOLDOWN_MS = 5 * 60 * 1000; // 5 min

function loadCooldown() {
    if (!fs.existsSync(cooldownPath)) {
        fs.writeFileSync(cooldownPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(cooldownPath, "utf8"));
}

function saveCooldown(db) {
    fs.writeFileSync(cooldownPath, JSON.stringify(db, null, 2));
}

function formatWait(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;

    if (min <= 0) return `${sec}s`;
    return sec === 0 ? `${min}min` : `${min}min ${sec}s`;
}

export default {
    name: "mp4",
    aliases: ["video", "vid", "ytvideo"],
    description: "Baixa vídeo do YouTube e envia em MP4.",
    usage: "[nome do vídeo ou link]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
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

        // ===== COOLDOWN (por grupo + usuário) =====
        const isCreator = sender === botConfig.botCreator;

        // Verifica VIP
        let isVip = false;
        const luckyPath = path.resolve("src/database/lucky.json");
        if (fs.existsSync(luckyPath)) {
            try {
                const luckyDB = JSON.parse(fs.readFileSync(luckyPath, "utf8"));
                const user = luckyDB[jid]?.[sender];
                const vipUntil = user?.items?.vip_profile || 0;
                if (vipUntil > Date.now()) {
                    isVip = true;
                }
            } catch {}
        }

        const cdDB = loadCooldown();
        const now = Date.now();
        
        if (!isCreator && !isVip) {
            if (!cdDB[jid]) cdDB[jid] = {};
            if (!cdDB[jid][sender]) cdDB[jid][sender] = 0;

            const lastUse = cdDB[jid][sender];

            if (now - lastUse < COOLDOWN_MS) {
              const wait = COOLDOWN_MS - (now - lastUse);
              await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
              return sock.sendMessage(
                  jid,
                  { text: `⏳ Espere *${formatWait(wait)}* para usar *${prefix}mp4* novamente.` },
                  { quoted: msg }
              );
            }

            // Grava o cooldown imediatamente para evitar múltiplas chamadas simultâneas
            cdDB[jid][sender] = now;
            saveCooldown(cdDB);
        }
        // =========================================

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
