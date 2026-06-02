// src/commands/creator/delcmd.js
import { deleteCustomCommand, listCustomCommands } from "../../utils/customCommands.js";

export default {
  name: "delcmd",
  aliases: ["removecmd", "deletecmd"],
  description: "Deletar um comando customizado",
  usage: ".delcmd <nome>",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const cmdName = args[0]?.toLowerCase();

    if (!cmdName) {
      const commands = listCustomCommands(sender);
      if (commands.length === 0) {
        return sock.sendMessage(jid, { 
          text: "❌ Você não tem comandos customizados.\n\nUse `criarcmd` para criar um." 
        }, { quoted: msg });
      }

      let text = "📋 *Comandos custom:*\n\n";
      commands.forEach((cmd, i) => {
        text += `${i + 1}. \`.${cmd.name}\` (${cmd.type})\n`;
      });
      text += "\n💡 Use `delcmd <nome>` para deletar um.";

      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    if (deleteCustomCommand(cmdName)) {
      return sock.sendMessage(jid, { 
        text: `✅ Comando *.${cmdName}* deletado com sucesso.` 
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, { 
      text: `❌ Comando *.${cmdName}* não encontrado.` 
    }, { quoted: msg });
  }
};
