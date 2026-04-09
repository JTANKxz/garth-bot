import { getBotConfig, updateBotConfig } from "../../config/botConfig.js";

export default {
  name: "clearauth",
  aliases: ["limparautorizacoes", "resetgroups"],
  description: "Remove todos os grupos da lista de autorizados.",
  category: "creator",

  async run({ sock, msg }) {
    const botConfig = getBotConfig();
    const sender = msg.key.participant || msg.key.remoteJid;
    const from = msg.key.remoteJid;

    // ✅ Proteção
    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(from, { text: "❌ Comando restrito ao Criador." }, { quoted: msg });
    }

    try {
      updateBotConfig({ allowedGroups: [] });
      await sock.sendMessage(from, { text: "✅ *LISTA DE GRUPOS RESETADA*\n\nTodos os grupos foram removidos da autorização.\nUse !auth para autorizar novos grupos." }, { quoted: msg });
    } catch (err) {
      console.error("Erro no clearauth:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao limpar as autorizações." }, { quoted: msg });
    }
  },
};
