import shan from "shan-server";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

const { ShAnTwitdl } = shan;

export default {
  name: "twitter",
  aliases: ["x", "tw"],
  description: "Baixa vídeos do X (Twitter)",
  usage: "[link]",
  category: "utils",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const gConfig = getGroupConfig(jid);
    const prefix = gConfig.prefix;
    const botConfig = getBotConfig();
    const botName = botConfig.botName || "BOT";

    const url = args.join(" ").trim();

    const isTwitter =
      /^(https?:\/\/)?((www|mobile)\.)?(twitter\.com|x\.com)\/.+/i.test(url);

    if (!url || !isTwitter) {
      await sock.sendMessage(jid, {
        react: {
          text: "❌",
          key: msg.key,
        },
      });

      return sock.sendMessage(
        jid,
        {
          text: `❗ Use: ${prefix}twitter [link]

Exemplos:
${prefix}twitter https://x.com/usuario/status/123456789
${prefix}twitter https://twitter.com/usuario/status/123456789`,
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
      const data = await ShAnTwitdl(url, "♡︎ 𝗦𝗵𝗔𝗻 ♡︎");

      if (!data || data.status !== "success" || !data.ShAn) {
        throw new Error("Nenhum vídeo encontrado.");
      }

      const caption = `╔════ *${botName}* ════╗
> 🐦 Plataforma: X (Twitter)

> 🔗 Link:
${url}
╚═════════════════╝`;

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
      console.error("Erro no comando Twitter:", err);

      await sock.sendMessage(jid, {
        react: {
          text: "❌",
          key: msg.key,
        },
      });

      await sock.sendMessage(
        jid,
        {
          text: `❌ Não foi possível baixar este vídeo.`,
        },
        { quoted: msg },
      );
    }
  },
};
