import { incrementStat } from "../../features/progress/progressStore.js";
import { checkAchievements } from "../../features/achievements/achievementsHandler.js";

import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadContentFromMessage } from "baileys";
import { processResizeVideo } from "../../services/video.js";

export default {
    name: "resize",
    aliases: ["redimensionar", "rv"],
    description: "Redimensiona um vídeo para 512x512 e reenvia",
    usage: "",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const groupId = msg.key.remoteJid;
        const user = msg.key.participant || msg.key.remoteJid;

        const webMessage =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            msg.message;

        if (!webMessage || !webMessage.videoMessage) {
            await sock.sendMessage(
                jid,
                { text: "❌ Marque ou responda um vídeo para redimensionar!" },
                { quoted: msg }
            );
            return;
        }

        let inputPath = null;
        let outputPath = null;

        try {
            await sock.sendMessage(jid, {
                react: { text: "⏳", key: msg.key }
            });

            const stream = await downloadContentFromMessage(
                webMessage.videoMessage,
                "video"
            );

            const tempName = Math.random().toString(36).substring(2, 10) + ".mp4";
            inputPath = path.join(tmpdir(), tempName);

            const writeStream = fs.createWriteStream(inputPath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();

            outputPath = await processResizeVideo(inputPath);

            await sock.sendMessage(
                jid,
                { video: { url: outputPath }, caption: "✅ Vídeo redimensionado para 512x512" },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: { text: "✅", key: msg.key }
            });

            // Incrementa stats
            incrementStat(groupId, user, "commands");

            await checkAchievements({
                sock,
                groupId,
                user,
                type: "command_use",
                quoted: msg,
                pushName: msg.pushName
            });

        } catch (err) {
            console.error("Erro no comando resize:", err);
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao redimensionar o vídeo." },
                { quoted: msg }
            );
            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });
        } finally {
            if (inputPath && fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }
            if (outputPath && fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        }
    }
};
