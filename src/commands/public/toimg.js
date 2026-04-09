import { downloadMediaMessage, getContentType } from "baileys";
import fs from "fs";
import path from "path";
import { getGroupConfig } from "../../utils/groups.js";

export default {
    name: "toimg",
    aliases: ["converter", "sti", "imgsticker"],
    description: "Converte figurinha em imagem PNG",
    usage: "Responda uma figurinha",
    category: "utils",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;
        const gConfig = getGroupConfig(jid);
        const prefix = gConfig.prefix;

        const quoted =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            msg.message;

        if (!quoted) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(
                jid,
                {
                    text: `❗ Você precisa marcar uma figurinha!\nUse: ${prefix}toimg`
                },
                { quoted: msg }
            );
        }

        const messageType = getContentType(quoted);
        if (messageType !== "stickerMessage") {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(
                jid,
                { text: "❌ Isso não é uma figurinha!" },
                { quoted: msg }
            );
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const buffer = await downloadMediaMessage(
                { message: quoted },
                "buffer",
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );

            const tempDir = path.resolve("./temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            const filePath = path.join(tempDir, `toimg_${Date.now()}.png`);
            fs.writeFileSync(filePath, buffer);

            await sock.sendMessage(
                jid,
                {
                    image: buffer,
                    caption: "🖼️ *Figurinha convertida com sucesso!*"
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            fs.unlinkSync(filePath);

        } catch (err) {
            console.error("Erro no comando toimg:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });

            return sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao converter a figurinha." },
                { quoted: msg }
            );
        }
    }
};
