import fs from "fs";
import path from "path";
import { getBotConfig } from "../../config/botConfig.js";

const DB_PATH = path.resolve(process.cwd(), "src", "database");

export default {
  name: "resetdb",
  aliases: ["resetarbot"],
  description: "Limpa todos os dados do banco de dados (EXCETO config e auto-responses).",
  category: "creator",

  async run({ sock, msg, args }) {
    const botConfig = getBotConfig();
    const sender = msg.key.participant || msg.key.remoteJid;
    const from = msg.key.remoteJid;

    // ✅ Proteção
    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(from, { text: "❌ Comando restrito ao Criador." }, { quoted: msg });
    }

    const confirm = args[0] === "--confirm";

    if (!confirm) {
      return sock.sendMessage(from, { 
          text: "⚠️ *AVISO DE SEGURANÇA*\n\n" +
                "Este comando apagará todos os saldos, conquistas, casamentos e níveis!\n\n" +
                "Para prosseguir, digite:\n" +
                `> *${botConfig.prefix || "!"}resetdb --confirm*`
      }, { quoted: msg });
    }

    try {
      const files = fs.readdirSync(DB_PATH);
      const excluded = ["botConfig.json", "autoResponse.json"];
      let removedCount = 0;

      for (const file of files) {
        if (file.endsWith(".json") && !excluded.includes(file)) {
          fs.writeFileSync(path.join(DB_PATH, file), JSON.stringify({}, null, 2));
          removedCount++;
        }
      }

      await sock.sendMessage(from, { text: `✅ *RESET CONCLUÍDO*\n\nForam resetados *${removedCount}* arquivos do banco de dados.\nConfigurações e Auto-Respostas foram mantidas.` }, { quoted: msg });

    } catch (err) {
      console.error("Erro no resetdb:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao realizar o reset." }, { quoted: msg });
    }
  },
};
