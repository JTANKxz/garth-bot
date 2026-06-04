// src/commands/creator/clearmemoria.js
import { clearCreatorMemory } from "../../utils/creatorAiMemory.js";

export default {
  name: "clearmemoria",
  aliases: ["limparai", "resetai", "cleardev"],
  description: "Limpa a memória da I.A. de desenvolvimento (Criador)",
  category: "creator",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;

    try {
      clearCreatorMemory();
      await sock.sendMessage(from, {
        text: "🧹 Memória da I.A. dev limpa com sucesso!"
      }, { quoted: msg });
    } catch (err) {
      console.error("Erro ao limpar memória do criador:", err);
      await sock.sendMessage(from, {
        text: "❌ Erro ao limpar memória da I.A. dev."
      }, { quoted: msg });
    }
  }
};
