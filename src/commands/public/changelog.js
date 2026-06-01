import { getBotConfig } from "../../config/botConfig.js";

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default {
  name: "changelog",
  aliases: ["atualizacao", "atualização", "update", "att"],
  description: "Mostra a ultima atualizacao do bot",
  category: "utils",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const config = getBotConfig();

    if (!config.changelog) {
      return sock.sendMessage(jid, { text: "Ainda nao tem changelog publicado." }, { quoted: msg });
    }

    const updatedAt = formatDate(config.changelogUpdatedAt);
    const text =
      `*Atualizacao do bot*\n\n` +
      `${config.changelog}` +
      (updatedAt ? `\n\nPublicado em: ${updatedAt}` : "");

    return sock.sendMessage(jid, { text }, { quoted: msg });
  }
};
