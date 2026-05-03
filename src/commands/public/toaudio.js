import { incrementStat } from "../../features/progress/progressStore.js";
import { checkAchievements } from "../../features/achievements/achievementsHandler.js";

import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadContentFromMessage } from "baileys";
import { processExtractAudio } from "../../services/audio.js";

export default {
    name: "getaudio",
    aliases: ["extrairaudio", "ta"],
    description: "Extrai o áudio de um vídeo respondido com opção de corte",
    usage: "[início] [fim] (ex: !getaudio 10 30 ou !getaudio 01:00 01:30)",
    category: "utils",

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
                { text: "❌ Marque ou responda um vídeo para extrair o áudio!" },
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

            // Pega o início e o fim passados nos argumentos, ex: !getaudio 10 20 (segundos) ou !getaudio 01:20 01:40
            const start = args[0] || null;
            const end = args[1] || null;

            outputPath = await processExtractAudio(inputPath, start, end);

            // Mimetype 'audio/mpeg' e ptt: true (envia como áudio de voz gravado, ou falso para música normal)
            // Vou mandar como arquivo de áudio normal (música). Se quiser como voz, seria ptt: true
            await sock.sendMessage(
                jid,
                { audio: { url: outputPath }, mimetype: 'audio/mpeg' },
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
            console.error("Erro no comando toaudio:", err);
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao extrair o áudio do vídeo." },
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
