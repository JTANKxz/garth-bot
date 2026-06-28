import fs from "fs";
import path from "path";
import { commands } from "../../handler/commandsHandler.js";

const dbPath = path.resolve("src/database/commandUsage.json");

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

export default {
  name: "topcmds",
  aliases: ["topcomandos", "comandosmaisusados", "rankcmds"],
  description: "Mostra o ranking dos comandos mais utilizados pelos usuários.",
  category: "public",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    
    try {
      const usage = loadJSON(dbPath);
      
      if (Object.keys(usage).length === 0) {
        return sock.sendMessage(from, { text: "📊 Nenhum comando foi utilizado ainda!" }, { quoted: msg });
      }

      const topCmds = Object.entries(usage)
        .filter(([name]) => {
          const cmd = commands.get(name);
          // Ignora comandos de dono/criador no ranking público (opcional)
          return cmd && cmd.category !== "owner" && cmd.category !== "creator" && cmd.category !== "admin";
        })
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15); // Top 15

      if (topCmds.length === 0) {
        return sock.sendMessage(from, { text: "📊 Nenhum comando público foi utilizado ainda!" }, { quoted: msg });
      }

      let text = "🏆 *RANKING DOS COMANDOS MAIS USADOS*\n\n";
      
      topCmds.forEach(([name, count], index) => {
        let medal = "🏅";
        if (index === 0) medal = "🥇";
        else if (index === 1) medal = "🥈";
        else if (index === 2) medal = "🥉";
        
        text += `${medal} *${index + 1}º* - !${name} (${count.toLocaleString("pt-BR")} usos)\n`;
      });

      text += "\n> 📊 _Estatísticas em tempo real_";

      await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (err) {
      console.error("Erro no comando topcmds:", err);
      await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao carregar os comandos mais usados." }, { quoted: msg });
    }
  }
};
