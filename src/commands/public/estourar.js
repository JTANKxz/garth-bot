import { incrementStat } from "../../features/progress/progressStore.js";
import { checkAchievements } from "../../features/achievements/achievementsHandler.js";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadContentFromMessage } from "baileys";
import { processEarrape } from "../../services/audio.js";

export default {
    name: "estourar",
    aliases: ["earrape", "alto", "estourado"],
    description: "Deixa o áudio estourado (funciona em áudio e vídeo)",
    usage: "",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const groupId = msg.key.remoteJid;
        const user = msg.key.participant || msg.key.remoteJid;

        const webMessage =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            msg.message;

        const isVideo = !!webMessage?.videoMessage;
        const isAudio = !!webMessage?.audioMessage;

        if (!isVideo && !isAudio) {
            await sock.sendMessage(
                jid,
                { text: "❌ Marque ou responda um áudio ou vídeo para estourar!" },
                { quoted: msg }
            );
            return;
        }

        let inputPath = null;
        let outputPath = null;

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            const type = isVideo ? "video" : "audio";
            const stream = await downloadContentFromMessage(
                isVideo ? webMessage.videoMessage : webMessage.audioMessage,
                type
            );

            const tempName = Math.random().toString(36).substring(2, 10) + (isVideo ? ".mp4" : ".mp3");
            inputPath = path.join(tmpdir(), tempName);

            const writeStream = fs.createWriteStream(inputPath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();

            outputPath = await processEarrape(inputPath, isVideo);

            if (isVideo) {
                await sock.sendMessage(
                    jid,
                    { video: { url: outputPath }, caption: "🎧 Áudio estourado!" },
                    { quoted: msg }
                );
            } else {
                await sock.sendMessage(
                    jid,
                    { audio: { url: outputPath }, mimetype: 'audio/mpeg' },
                    { quoted: msg }
                );
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            incrementStat(groupId, user, "commands");
            await checkAchievements({
                sock, groupId, user, type: "command_use", quoted: msg, pushName: msg.pushName
            });

        } catch (err) {
            console.error("Erro no comando estourar:", err);
            await sock.sendMessage(jid, { text: "❌ Ocorreu um erro ao estourar o áudio/vídeo." }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};
