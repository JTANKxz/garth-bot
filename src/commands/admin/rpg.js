import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js";

export default {
  name: "rpg",
  description: "Ativa ou desativa os comandos de economia do grupo",
  usage: "(on/off)",
  category: "admin",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const groupConfig = getGroupConfig(jid);
    const option = args[0]?.toLowerCase();

    if (!option || !["on", "off"].includes(option)) {
      return sock.sendMessage(jid, {
        text: `Use: ${groupConfig.prefix || "!"}rpg on | off`,
      }, { quoted: msg });
    }

    const enabled = option === "on";
    updateGroupConfig(jid, { rpg: enabled });

    await sock.sendMessage(jid, {
      text: enabled
        ? "RPG ativado."
        : "RPG desativado. Os comandos de economia ficarao ocultos e sem resposta.",
    }, { quoted: msg });
  },
};
