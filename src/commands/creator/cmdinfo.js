// src/commands/creator/listcmd.js
import { listCustomCommands } from "../../utils/customCommands.js";

export default {
  name: "listcmd",
  aliases: ["cmds", "mycommands"],
  description: "Listar seus comandos customizados",
  usage: ".listcmd",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const commands = listCustomCommands(sender);

    if (commands.length === 0) {
      return sock.sendMessage(jid, { 
        text: "❌ Você não tem comandos customizados.\n\nUse `.criarcmd` para criar um." 
      }, { quoted: msg });
    }

    let text = "╔═══✦ *SEUS COMANDOS* ✦═══\n║\n";

    commands.forEach((cmd, i) => {
      const icon = {
        message: "💬",
        random: "🎲",
        sequential: "📝",
        regex: "🔍",
        action: "⚙️"
      }[cmd.type] || "📌";

      text += `║ ${i + 1}. ${icon} *.${cmd.name}*\n`;
      text += `║    Tipo: ${cmd.type}\n`;
      text += `║    Categoria: ${cmd.category}\n`;
      text += `║    Criado: ${new Date(cmd.createdAt).toLocaleDateString("pt-BR")}\n`;
      text += `║\n`;
    });

    text += `╚═════════════════════\n\n💡 Use:
> \`cmdinfo <nome>\` - Ver detalhes
> \`delcmd <nome>\` - Deletar
> \`criarcmd\` - Criar novo`;

    return sock.sendMessage(jid, { text }, { quoted: msg });
  }
};
