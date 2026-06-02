// src/commands/creator/noprefix.js
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js";

export default {
  name: "noprefix",
  aliases: ["nopfx"],
  description: "Permite ao criador executar comandos sem prefixo neste grupo",
  usage: "noprefix on|off",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Apenas funciona em grupos
    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { 
        text: "❌ Este comando só funciona em grupos." 
      }, { quoted: msg });
    }

    const groupConfig = getGroupConfig(jid);
    const action = (args[0] || "").toLowerCase();

    if (action === "on") {
      groupConfig.noprefix = true;
      updateGroupConfig(jid, groupConfig);

      return sock.sendMessage(jid, {
        text: "Noprefix ativado!"
      }, { quoted: msg });
    }

    if (action === "off") {
      groupConfig.noprefix = false;
      updateGroupConfig(jid, groupConfig);

      return sock.sendMessage(jid, {
        text: "Noprefix desativado."
      }, { quoted: msg });
    }

    // Status
    const status = groupConfig.noprefix ? "🟢 Ativado" : "🔴 Desativado";
    return sock.sendMessage(jid, {
      text: `Status do Noprefix: ${status}\n\nUse:\n \`noprefix on\` - Ativar\n \`.noprefix off\` - Desativar`
    }, { quoted: msg });
  }
};
