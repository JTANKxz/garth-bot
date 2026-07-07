import { getBotConfig } from "../../config/botConfig.js";
import { resetGroupEconomy } from "../../utils/groups.js";

export default {
  name: "resetgrupo",
  aliases: ["restaurargrupo", "resetargrupo"],
  description: "Reseta as configurações de economia e loja do grupo para os padrões globais",
  category: "creator",

  async run({ sock, msg }) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const botConfig = getBotConfig();

    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Comando restrito ao criador." }, { quoted: msg });
    }

    const groupId = msg.key.remoteJid;
    if (!groupId.endsWith("@g.us")) {
      return sock.sendMessage(groupId, { text: "❌ Este comando só funciona em grupos!" }, { quoted: msg });
    }

    const changed = resetGroupEconomy(groupId);

    if (changed) {
      await sock.sendMessage(groupId, { text: "✅ Configurações de economia do grupo resetadas para o Padrão Global." }, { quoted: msg });
    } else {
      await sock.sendMessage(groupId, { text: "⚠️ Este grupo já está usando o Padrão Global." }, { quoted: msg });
    }
  }
};
