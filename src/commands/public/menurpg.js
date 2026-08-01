import { commands } from "../../handler/commandsHandler.js";
import { getGroupConfig } from "../../utils/groups.js";
import { isCommandDisabled } from "../../utils/disabledCommands.js";
import { getEconomyCommandNames, isRpgEnabled } from "../../utils/rpg.js";

export default {
  name: "menurpg",
  aliases: ["rpgmenu", "menueconomia"],
  description: "Mostra os comandos do RPG",
  category: "rpg",
  showInMenu: false,

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const groupConfig = getGroupConfig(from);
    if (!isRpgEnabled(groupConfig)) return;

    const prefix = groupConfig?.prefix || "!";
    const entries = getEconomyCommandNames()
      .map(name => commands.get(name))
      .filter(cmd => cmd?.permission === "public" && cmd.showInMenu !== false)
      .filter(cmd => !isCommandDisabled(cmd.name))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map(cmd => `> *${prefix}${cmd.name}* - ${cmd.description || "Comando do RPG"}`);

    const text = [
      "MENU RPG",
      "--------------------",
      entries.length ? entries.join("\n") : "Nenhum comando de RPG disponivel.",
      "--------------------",
      `Use ${prefix}rpg off para desativar o RPG no grupo (administradores).`
    ].join("\n");

    await sock.sendMessage(from, { text }, { quoted: msg });
  }
};
