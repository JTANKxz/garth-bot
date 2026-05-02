import { incrementStat } from "../../features/progress/progressStore.js";
import { checkAchievements } from "../../features/achievements/achievementsHandler.js";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadContentFromMessage } from "baileys";
import { processLowQuality } from "../../services/video.js";

export default {
    name: "144p",
    aliases: ["lowquality", "lq", "ruim", "tekpix"],
    description: "Diminui drasticamente a qualidade de um vídeo (144p)",
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
                { text: "❌ Marque ou responda um vídeo para estragar a qualidade!" },
                { quoted: msg }
            );
            return;
        }

        let inputPath = null;
        let outputPath = null;

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            const stream = await downloadContentFromMessage(
                webMessage.videoMessage,
                "video"
            );

            const tempName = Math.random().toString(36).substring(2, 10) + ".mp4";
            inputPath = path.join(tmpdir(), tempName);

            const writeStream = fs.createWriteStream(inputPath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();

            outputPath = await processLowQuality(inputPath);

            await sock.sendMessage(
                jid,
                { video: { url: outputPath }, caption: "📱 Gravado na tekpix" },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            incrementStat(groupId, user, "commands");
            await checkAchievements({
                sock, groupId, user, type: "command_use", quoted: msg, pushName: msg.pushName
            });

        } catch (err) {
            console.error("Erro no comando 144p:", err);
            await sock.sendMessage(jid, { text: "❌ Ocorreu um erro ao diminuir a qualidade." }, { quoted: msg });
        } finally {
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};
