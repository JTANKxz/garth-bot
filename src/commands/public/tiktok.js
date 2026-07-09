import shan from "shan-server";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

const { ShAnTikdl } = shan;

export default {
  name: "tiktok",
  aliases: ["ttk"],
  description: "Baixa vídeos do TikTok",
  usage: "[link]",
  category: "utils",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const gConfig = getGroupConfig(jid);
    const prefix = gConfig.prefix;
    const botConfig = getBotConfig();
    const botName = botConfig.botName || "BOT";

    const url = args.join(" ").trim();

    const isTikTok = /^(https?:\/\/)?((www|vm|vt)\.)?tiktok\.com\/.+/i.test(
      url,
    );

    if (!url || !isTikTok) {
      await sock.sendMessage(jid, {
        react: {
          text: "❌",
          key: msg.key,
        },
      });

      return sock.sendMessage(
        jid,
        {
          text: `❗ Use: ${prefix}tiktok [link]

Exemplos:
${prefix}tiktok https://www.tiktok.com/@usuario/video/123456789
${prefix}tiktok https://vm.tiktok.com/XXXXXXXX/
${prefix}tiktok https://vt.tiktok.com/XXXXXXXX/`,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(jid, {
      react: {
        text: "⏳",
        key: msg.key,
      },
    });

    try {
      const data = await ShAnTikdl(url, "♡︎ 𝗦𝗵𝗔𝗻 ♡︎");

      if (!data || data.status !== "success" || !data.ShAn) {
        throw new Error("Nenhum vídeo encontrado.");
      }

      const caption = `╔════ *${botName}* ════╗
> 🎵 Plataforma: TikTok

> 🔗 Link:
${url}
╚═══════════════╝`;

      await sock.sendMessage(
        jid,
        {
          video: {
            url: data.ShAn,
          },
          mimetype: "video/mp4",
          caption,
        },
        { quoted: msg },
      );

      await sock.sendMessage(jid, {
        react: {
          text: "✅",
          key: msg.key,
        },
      });
    } catch (err) {
      console.error("Erro no comando TikTok:", err);

      await sock.sendMessage(jid, {
        react: {
          text: "❌",
          key: msg.key,
        },
      });

      await sock.sendMessage(
        jid,
        {
          text: `❌ Não foi possível baixar este vídeo.

Possíveis motivos:
• Link inválido.
• Vídeo privado.
• O servidor da API está indisponível.
• O vídeo foi removido.`,
        },
        { quoted: msg },
      );
    }
  },
};
