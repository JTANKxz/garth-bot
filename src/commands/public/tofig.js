import { incrementStat } from "../../features/progress/progressStore.js";
import { checkAchievements } from "../../features/achievements/achievementsHandler.js";

import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadContentFromMessage } from "baileys";
import { processStaticSticker, processAnimatedStickerFromVideo } from "../../services/sticker.js";

export default {
    name: "tofig",
    aliases: ["f", "s", "fig", "figurinha", "skank"],
    description: "Cria figurinhas de imagem, GIF ou vídeo (máx 10s)",
    usage: "[nome do pack/autor]",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const groupId = msg.key.remoteJid;
        const user = msg.key.participant || msg.key.remoteJid;

        const webMessage =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            msg.message;

        if (!webMessage) {
            await sock.sendMessage(
                jid,
                { text: "❌ Marque ou responda uma imagem, GIF ou vídeo!" },
                { quoted: msg }
            );
            return;
        }

        const isImage = !!webMessage.imageMessage;
        const isVideo = !!webMessage.videoMessage;

        if (!isImage && !isVideo) {
            await sock.sendMessage(
                jid,
                { text: "❌ Marque ou responda uma imagem, GIF ou vídeo!" },
                { quoted: msg }
            );
            return;
        }

        // Extrai pack/autor do args
        const [packArg, authorArg] = args
            .join(" ")
            .split("/")
            .map(s => s?.trim());

        const packName = packArg || msg.pushName || "GARTH-BOT";
        const authorName = authorArg || "";

        const metadata = {
            username: packName,
            botName: authorName
        };

        let inputPath = null;

        try {
            const type = isImage ? "image" : "video";
            const stream = await downloadContentFromMessage(
                webMessage[`${type}Message`],
                type
            );

            const tempName =
                Math.random().toString(36).substring(2, 10) +
                (isImage ? ".jpg" : ".mp4");

            inputPath = path.join(tmpdir(), tempName);

            const writeStream = fs.createWriteStream(inputPath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();

            if (isImage) {
                inputPath = await processStaticSticker(inputPath, metadata);
            } else {
                const seconds = webMessage.videoMessage?.seconds || 0;

                if (seconds > 10) {
                    await sock.sendMessage(
                        jid,
                        { text: "❌ O vídeo precisa ter até 10 segundos!" },
                        { quoted: msg }
                    );
                    return;
                }

                inputPath = await processAnimatedStickerFromVideo(
                    inputPath,
                    metadata
                );
            }

            await sock.sendMessage(
                jid,
                { sticker: { url: inputPath } },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: { text: "✅", key: msg.key }
            });

            // 🏆 CONTADOR + CONQUISTAS
            incrementStat(groupId, user, "stickers");

            await checkAchievements({
                sock,
                groupId,
                user,
                type: "sticker_create",
                quoted: msg,
                pushName: msg.pushName
            });

        } catch (err) {
            console.error("Erro no comando sticker:", err);
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao criar a figurinha." },
                { quoted: msg }
            );
        } finally {
            if (inputPath && fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }
        }
    }
};
