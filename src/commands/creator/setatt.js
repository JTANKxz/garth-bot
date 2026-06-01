import { updateBotConfig } from "../../config/botConfig.js";

export default {
  name: "setatt",
  aliases: ["setupdate", "setchangelog"],
  description: "Define o changelog global do bot",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const text = args.join(" ").trim();

    if (!text) {
      return sock.sendMessage(jid, { text: "Use: !setatt texto da atualizacao" }, { quoted: msg });
    }

    updateBotConfig({
      changelog: text,
      changelogUpdatedAt: Date.now()
    });

    return sock.sendMessage(jid, { text: "Changelog atualizado." }, { quoted: msg });
  }
};
