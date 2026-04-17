//src/commands/public/play.js
import fs from "fs";
import path from "path";
import yts from "yt-search";
import dxz from "dxz-ytdl";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

const { ytmp3 } = dxz;

// Cooldown DB (persistente, funciona mesmo se reiniciar)
const cooldownPath = path.resolve("src/database/playCooldown.json");
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
    name: "play",
    aliases: ["p", "msc", "musica", "musiquinha", "musga", "music", "mp3"],
    description: "Baixa música do YouTube e envia em áudio.",
    usage: "[nome da música]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        const gConfig = getGroupConfig(jid);
        const prefix = gConfig.prefix;
        const botConfig = getBotConfig();
        const botName = botConfig.botName || "BOT";

        const query = args.join(" ").trim();

        if (!query) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(
                jid,
                { text: `❗ Use: ${prefix}play [nome da música]` },
                { quoted: msg }
            );
        }

        // ===== COOLDOWN (por grupo + usuário) =====
        const isCreator = sender === botConfig.botCreator;
        const cdDB = loadCooldown();
        const now = Date.now();
        
        if (!isCreator) {
            if (!cdDB[jid]) cdDB[jid] = {};
            if (!cdDB[jid][sender]) cdDB[jid][sender] = 0;

            const lastUse = cdDB[jid][sender];

            if (now - lastUse < COOLDOWN_MS) {
              const wait = COOLDOWN_MS - (now - lastUse);
              await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
              return sock.sendMessage(
                  jid,
                  { text: `⏳ Espere *${formatWait(wait)}* para usar *${prefix}play* novamente.` },
                  { quoted: msg }
              );
            }
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
                    thumbnail: first.thumbnail,
                };
            }

            await sock.sendMessage(jid, { react: { text: "🔄", key: msg.key } });

            outputFile = path.join(process.cwd(), `temp-${Date.now()}.mp3`);

            const result = await ytmp3(videoUrl, "128k", {
                path: outputFile,
                retries: 3,
            });

            let thumb = null;
            if (metadata.thumbnail) {
                try {
                    const res = await fetch(metadata.thumbnail);
                    if (res.ok) {
                        thumb = Buffer.from(await res.arrayBuffer());
                    }
                } catch { }
            }

            const audioBuffer = fs.readFileSync(outputFile);

            const caption =
                `╔════ *${botName}* ════╗
> Título: ${metadata.title || result.title}

> Duração: ${metadata.duration || `${result.duration}s`}

> Canal: ${metadata.channel || result.author}

> ${metadata.views || ""}

> Link: ${videoUrl}
╚═════════════════╝`;

            if (thumb) {
                await sock.sendMessage(jid, { image: thumb, caption }, { quoted: msg });
            }

            await sock.sendMessage(
                jid,
                {
                    audio: audioBuffer,
                    mimetype: "audio/mpeg",
                    ptt: false,
                },
                { quoted: msg }
            );

            // apaga arquivo temp
            try {
                fs.unlinkSync(outputFile);
            } catch { }
            outputFile = null;

            // grava cooldown SOMENTE se deu certo e não for criador
            if (!isCreator) {
                cdDB[jid][sender] = now;
                saveCooldown(cdDB);
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Erro no comando play:", err);

            // tenta limpar arquivo temp se sobrou
            if (outputFile) {
                try { fs.unlinkSync(outputFile); } catch { }
            }

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao processar sua solicitação." },
                { quoted: msg }
            );
        }
    },
};