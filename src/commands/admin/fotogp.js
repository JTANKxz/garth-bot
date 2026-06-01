import { downloadMediaMessage, getContentType } from "baileys";

export default {
  name: "fotogp",
  aliases: ["setfotogp", "setppgp", "perfilgp"],
  description: "Usa a imagem respondida como foto do grupo",
  usage: "responda uma imagem com fotogp",
  category: "admin",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMessage = context?.quotedMessage;
    const type = quotedMessage ? getContentType(quotedMessage) : null;

    if (!jid.endsWith("@g.us")) return;

    if (!quotedMessage || type !== "imageMessage") {
      return sock.sendMessage(jid, { text: "Responda uma imagem para usar como foto do grupo." }, { quoted: msg });
    }

    try {
      const buffer = await downloadMediaMessage(
        { message: quotedMessage },
        "buffer",
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      await sock.updateProfilePicture(jid, buffer);
      return sock.sendMessage(jid, { text: "Foto do grupo atualizada." }, { quoted: msg });
    } catch (err) {
      console.error("Erro ao alterar foto do grupo:", err);
      return sock.sendMessage(jid, { text: "Nao consegui alterar a foto. Veja se o bot e admin." }, { quoted: msg });
    }
  }
};
