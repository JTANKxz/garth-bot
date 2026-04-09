import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadContentFromMessage } from "baileys";
import { processStaticSticker, processAnimatedSticker, isAnimatedSticker } from "../../services/sticker.js";

export default {
    name: "rename",
    aliases: ["renomear", "renamefig"],
    description: "Reenvia a figurinha com novo nome de pack e autor (suporta animadas)",
    usage: "[novo pack/nome do autor]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const webMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!webMessage) {
            await sock.sendMessage(jid, { text: "❌ Responda a uma figurinha para renomear!" }, { quoted: msg });
            return;
        }

        const stickerMsg = webMessage.stickerMessage;
        if (!stickerMsg) {
            await sock.sendMessage(jid, { text: "❌ A mensagem marcada não é uma figurinha!" }, { quoted: msg });
            return;
        }

        const [packArg, authorArg] = args.join(" ").split("/").map(s => s?.trim());
        const packName = packArg || msg.pushName || "GARTH-BOT";
        const authorName = authorArg || "";
        const metadata = { username: packName, botName: authorName };

        let inputPath = null;
        let finalPath = null;

        try {
            
            const stream = await downloadContentFromMessage(stickerMsg, "sticker");
            const ext = ".webp";
            const tempName = Math.random().toString(36).substring(2, 10) + ext;
            inputPath = path.join(tmpdir(), tempName);

            const writeStream = fs.createWriteStream(inputPath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();

            const animated = await isAnimatedSticker(inputPath);

            if (animated) {
                finalPath = await processAnimatedSticker(inputPath, metadata);
            } else {
                finalPath = await processStaticSticker(inputPath, metadata);
            }

            await sock.sendMessage(jid, { sticker: { url: finalPath } }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando rename:", err);
            await sock.sendMessage(jid, { text: "❌ Ocorreu um erro ao renomear a figurinha." }, { quoted: msg });
        } finally {
            
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (finalPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        }
    }
};
