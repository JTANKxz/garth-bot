import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadContentFromMessage } from "baileys";
import { processCorteAudio } from "../../services/audio.js";

export default {
    name: "cortaraudio",
    aliases: ["corteaudio", "cuttaudio", "ca"],
    description: "Corta um trecho de um áudio respondido",
    usage: "!cortaraudio [início] [fim]  (ex: !ca 10 30  ou  !ca 01:00 01:30)",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;

        // Suporta áudio direto ou áudio dentro de uma resposta
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const webMessage = quoted || msg.message;

        const audioMsg = webMessage?.audioMessage;

        if (!audioMsg) {
            return sock.sendMessage(jid, {
                text: `✂️ Responda um *áudio* com:\n\n*!ca [início] [fim]*\n\nExemplos:\n> !ca 10 30 _(segundos)_\n> !ca 01:00 01:30 _(minutos:segundos)_\n\n_Sem argumentos = envia o áudio completo sem corte._`
            }, { quoted: msg });
        }

        const start = args[0] || null;
        const end   = args[1] || null;

        if (!start && !end) {
            return sock.sendMessage(jid, {
                text: `⚠️ Informe o tempo de início e fim!\n\nExemplo: *!ca 10 40* ou *!ca 01:20 02:00*`
            }, { quoted: msg });
        }

        let inputPath  = null;
        let outputPath = null;

        try {
            await sock.sendMessage(jid, { react: { text: "✂️", key: msg.key } });

            const stream  = await downloadContentFromMessage(audioMsg, "audio");
            const tmpName = Math.random().toString(36).substring(2, 10) + ".mp3";
            inputPath     = path.join(tmpdir(), tmpName);

            const writeStream = fs.createWriteStream(inputPath);
            for await (const chunk of stream) writeStream.write(chunk);
            await new Promise(res => writeStream.end(res));

            outputPath = await processCorteAudio(inputPath, start, end);

            await sock.sendMessage(jid,
                { audio: { url: outputPath }, mimetype: "audio/mpeg" },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando cortaraudio:", err);
            await sock.sendMessage(jid, {
                text: "❌ Erro ao cortar o áudio. Verifique os tempos e tente novamente."
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            if (inputPath  && fs.existsSync(inputPath))  fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};
