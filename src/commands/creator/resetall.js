import fs from "fs";
import path from "path";
import { getBotConfig, updateBotConfig } from "../../config/botConfig.js";
import { resetAllCounts as resetAllMessageCounts } from "../../features/messageCounts.js";
import { resetAllCounts as resetAllSimpleMessageCounts } from "../../features/simpleMessageCounts.js";
import { resetAllGroupConfigs } from "../../utils/groups.js";

const DB_PATH = path.resolve(process.cwd(), "src", "database");

export default {
  name: "resetall",
  aliases: ["limpezatotal", "resetartudo", "fullreset"],
  description: "Apaga todos os dados, rankings, mensagens e autorizações de grupos",
  category: "creator",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const botConfig = getBotConfig();
    const prefix = botConfig.prefix || "!";

    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(from, { text: "❌ Comando restrito ao Criador." }, { quoted: msg });
    }

    if (args[0] !== "--confirm") {
      return sock.sendMessage(from, {
        text:
          "⚠️ *LIMPEZA TOTAL*\n\n" +
          "Isso apagará todos os dados armazenados: saldos, rankings, mensagens, economia, usuários, configurações dos grupos e autorizações.\n\n" +
          "A identidade e as configurações essenciais do bot serão preservadas para ele continuar funcionando.\n\n" +
          `Para confirmar, envie:\n> *${prefix}resetall --confirm*`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

      // Os módulos de ranking mantêm cache em memória, então devem ser limpos antes
      // dos arquivos para que nenhum dado antigo volte a ser salvo.
      resetAllMessageCounts();
      resetAllSimpleMessageCounts();
      const resetGroups = resetAllGroupConfigs();

      let resetFiles = 0;
      for (const file of fs.readdirSync(DB_PATH)) {
        if (!file.endsWith(".json")) continue;

        // botConfig guarda criador, prefixo e identidade do bot. As autorizações
        // são removidas separadamente logo abaixo.
        if (file === "botConfig.json" || file === "messageCounts.json" || file === "simpleMessageCounts.json" || file === "groups.json") continue;

        fs.writeFileSync(path.join(DB_PATH, file), "{}\n", "utf-8");
        resetFiles++;
      }

      updateBotConfig({ allowedGroups: [], disabledCommands: {} });

      await sock.sendMessage(from, {
        text:
          "✅ *LIMPEZA TOTAL CONCLUÍDA*\n\n" +
          `• ${resetFiles} bancos de dados apagados\n` +
          `• ${resetGroups} configurações de grupo removidas\n` +
          "• Rankings e contadores de mensagens zerados\n" +
          "• Todas as autorizações de grupo removidas\n\n" +
          "O bot continuará acessível apenas ao Criador até novos grupos serem autorizados."
      }, { quoted: msg });
      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("Erro no resetall:", error);
      await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
      await sock.sendMessage(from, { text: "❌ Não foi possível concluir a limpeza total." }, { quoted: msg });
    }
  }
};
